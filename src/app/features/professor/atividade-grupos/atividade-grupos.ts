import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../shared/header/header';
import { RelatorioService } from '../../../services/relatorio.service';
import { AtividadeService } from '../../../services/atividade.service';
import { GrupoService } from '../../../services/grupo.service';
import { GruposDTO } from '../../../models/grupos-dto';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-atividade-grupos',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, DragDropModule],
  templateUrl: './atividade-grupos.html',
  styleUrls: ['./atividade-grupos.css'],
})
export class AtividadeGruposComponent implements OnInit {
  atividadeHash: string = '';
  atividadeId!: number;

  grupos: GruposDTO[] = [];
  nomeAtividade: string = '';

  grupoSelecionado: any = { idGrupo: null, nomeGrupo: '' };

  modalAberto = false;

  ModalResetTodos = false;
  ModalResetGrupo = false;
  ModalSucesso = false;
  ModalErro = false;
  ModalAtualizar = false;
  grupoResetId: number | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private relatorioService: RelatorioService,
    private atividadeService: AtividadeService,
    private cdr: ChangeDetectorRef,
    private grupoService: GrupoService,
  ) {}

  ngOnInit(): void {
    this.carregarGrupos();
  }

  gerarQRCodes() {
    if (!this.atividadeHash) {
      alert('Erro: Hash não encontrado.');
      return;
    }

    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/professor/atividades/qrcodes'], {
        queryParams: { hash: this.atividadeHash },
      }),
    );

    window.open(url, '_blank');
  }

  abrirEdicao(grupo: any) {
    this.grupoSelecionado = { ...grupo };
    this.modalAberto = true;
  }

  salvarGrupo() {
    const id = this.grupoSelecionado.idGrupo;
    const nome = this.grupoSelecionado.nomeGrupo;

    if (!nome || nome.trim() === '') return;

    this.atividadeService.alterarNomeGrupo(id, nome).subscribe({
      next: () => {
        this.fecharModal();
        this.carregarGrupos();
      },
      error: (err) => {
        console.error('Erro ao editar grupo:', err);
        alert('Erro ao editar o grupo.');
      },
    });
  }

  fecharModal() {
    this.modalAberto = false;
  }

  temAlunos(): boolean {
    return (
      this.grupos.length > 0 &&
      this.grupos.every((grupo) => grupo.qtdeUsuarios === grupo.qtdePessoas)
    );
  }

  exportarPDF() {
    if (!this.atividadeId) {
      alert('Erro: ID da atividade não carregado.');
      return;
    }

    const idNumerico = Number(String(this.atividadeId).replace(/\D/g, ''));

    this.relatorioService.downloadPdf(idNumerico).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-agrupa-${idNumerico}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Erro ao gerar PDF:', err),
    });
  }

  carregarGrupos() {
    this.grupoService.listarTodosGrupos().subscribe({
      next: (dados) => {
        console.log('DADOS QUE CHEGARAM AI: ', dados);
        this.grupos = dados.map((g: any) => {
          const usuariosValidos = (g.usuarios || []).filter(
            (u: any) => u && u.nomeUsuario && u.nomeUsuario.trim() !== '',
          );

          return {
            ...g,
            usuarios: usuariosValidos,
            qtdeUsuarios: usuariosValidos.length,
          };
        });

        if (dados.length > 0) {
          this.nomeAtividade = dados[0].nomeAtividade;
          this.atividadeHash = dados[0].hash;
          this.atividadeId = dados[0].idAtividade;
        }

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erro ao carregar grupos:', err),
    });
  }

  abrirConfirmacaoResetTodos() {
    this.ModalResetTodos = true;
  }

  confirmarResetTodos() {
    this.ModalResetTodos = false;

    this.ModalSucesso = true;
    this.ModalErro = false;

    this.grupoService.resetarTodosGrupos().subscribe({
      next: () => {},
      error: () => {},
    });

    setTimeout(() => {
      window.location.reload();
    }, 2500);
  }

  abrirConfirmacaoResetGrupo(idGrupo: number) {
    this.grupoResetId = idGrupo;
    this.ModalResetGrupo = true;
  }

  confirmarResetGrupo() {
    if (!this.grupoResetId) return;

    this.ModalResetGrupo = false;

    this.ModalSucesso = true;
    this.ModalErro = false;

    this.grupoService.resetarGrupo(this.grupoResetId).subscribe({
      next: () => {},
      error: () => {},
    });

    this.grupoResetId = null;

    setTimeout(() => {
      window.location.reload();
    }, 2500);
  }

  atualizarGrupos() {
    this.ModalAtualizar = true;

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }

  /**
   * Gerencia o evento de arrastar e soltar (Drag and Drop) dos alunos entre os grupos.
   *
   * Este método intercepta a ação quando o usuário solta um card de aluno e avalia o contexto:
   * - Caso de Reordenação: Se o container de origem e destino forem iguais,
   *   apenas reorganiza a posição do aluno dentro da mesma lista (moveItemInArray).
   * - Caso de Transferência: Se os containers forem diferentes, remove o aluno da
   *   lista de origem e o injeta na lista de destino (transferArrayItem),
   *   acionando o recálculo de vagas na interface.
   *
   * @param {CdkDragDrop<any[]>} event Objeto gerado pelo Angular CDK contendo o estado
   *        do drag, incluindo os arrays de origem (previousContainer) e destino (container),
   *        além dos índices inicial e final do item.
   * 
   * @param {number} grupoDestinoId Identificador único do grupo onde o aluno foi solto.
   *        (Pode ser utilizado para persistência via API no banco de dados).
   *
   * @returns {void} O método não possui retorno, apenas altera o estado interno dos arrays.
   */
  onDrop(event: CdkDragDrop<any[]>, grupoDestinoId: number) {
    //o array atual (previous) é igual o novo array??
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      //descobrimos quem é o aluno olhando o relatorio do event
      //event.previousContainer.data fala da onde esse aluno saiu
      //event.previousIndex diz qual era a posição dele aonde ele saiu
      const alunoSendoMovido = event.previousContainer.data[event.previousIndex];

      //funçao do proprio angular
      //vai no array antigo . previusContainer.data
      //ele apaga o aluno movido do array antigo (previousIndex)
      //depois ele vai no array novo, container.data
      //abre um espaço novo la e insere o novo aluno (currentIndex)
      transferArrayItem(
        event.previousContainer.data, //array de origem
        event.container.data, //array de destino
        event.previousIndex, //posição no array antigo
        event.currentIndex, //posição no array novo
      );
      //atualiza o numero de pessoas por grupo na tela
      this.atualizarContagens();
    }
  }

  // Função auxiliar para recalcular as vagas na tela
  atualizarContagens() {
    this.grupos.forEach((grupo) => {
      grupo.qtdeUsuarios = grupo.usuarios.length;
    });
    this.cdr.detectChanges();
  }
}
