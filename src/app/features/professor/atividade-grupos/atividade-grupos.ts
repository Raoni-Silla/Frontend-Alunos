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
import { moverAlunoForm } from '../../../models/MoverAlunoForm';
import { AdicionarNovoAlunoForm } from '../../../models/AdicionarNovoAlunoForm';

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
  ModalErroDragAndDrop = false;
  ModalAdicionarAluno = false;
  salvando = false;

  nome = '';
  sobrenome = '';
  idGrupoSelecionado: number | null = null;

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
   * @description
   * Manipula o evento de Drag and Drop (arrastar e soltar) de alunos entre os grupos.
   *
   * Se o aluno for movido dentro do mesmo grupo, apenas reordena a lista localmente.
   * Se for movido para um grupo diferente, realiza a validação de capacidade do grupo de destino,
   * atualiza a interface (transferência visual) e envia a requisição assíncrona para o back-end
   * persistir a mudança no banco de dados.
   *
   * @param {CdkDragDrop<any[]>} event - O evento disparado pelo CDK Drag & Drop contendo os dados do container de origem e destino, além dos índices.
   *
   * @returns {void} Não retorna nada. Em caso de lotação máxima, exibe um modal de erro temporário.
   */
  onDrop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Pega os IDs diretamente do evento do CDK (muito mais seguro)
      const idDestino = Number(event.container.id);
      const idSaida = Number(event.previousContainer.id);

      const grupoDestino = this.grupos.find((g) => g.idGrupo === idDestino);

      if (grupoDestino && grupoDestino.qtdeUsuarios >= grupoDestino.qtdePessoas) {
        this.ModalErroDragAndDrop = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.ModalErroDragAndDrop = false;
          this.cdr.detectChanges();
        }, 2000);
        return;
      }

      const alunoSendoMovido = event.previousContainer.data[event.previousIndex];

      // Atualiza os arrays visualmente
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      const moverAlunoForm: moverAlunoForm = {
        idGrupoDestino: idDestino,
        idGrupoSaida: idSaida,
        nomeUsuario: alunoSendoMovido.nomeUsuario,
      };

      this.grupoService.moverAluno(moverAlunoForm).subscribe({
        next: () => {
          this.carregarGrupos();
        },
        error: (erro) => {
          console.error('Erro ao mover aluno no back-end', erro);
          this.carregarGrupos();
        },
      });
    }
  }

  abrirModalEdicaoNome(idGrupo: number) {
    this.ModalAdicionarAluno = true;
    this.idGrupoSelecionado = idGrupo;
  }

  /**
   * Orquestra o fluxo de adição de um novo aluno a um grupo selecionado via modal.
   * * <p>
   * Este método é acionado pelo botão de envio do modal e gerencia todo o ciclo de vida da interação:
   * 1. Trava a interface ativando o estado de carregamento (`salvando = true`).
   * 2. Monta o objeto (DTO) com o ID do grupo selecionado e os dados digitados (nome e sobrenome).
   * 3. Dispara a requisição HTTP para o backend via `grupoService`.
   * 4. Em caso de sucesso, chama o método `carregarGrupos()` para atualizar a tela com os dados novos do banco.
   * 5. Em ambos os cenários (sucesso ou erro), garante a limpeza dos inputs, o fechamento do modal
   * e a liberação do botão de envio (`salvando = false`).
   * </p>
   * * @throws {Error} Lança uma exceção caso o método seja chamado sem um `idGrupoSelecionado` previamente definido.
   */
  adicionarAlunoNoGrupo() {
    this.salvando = true;
    if (this.idGrupoSelecionado !== null) {
      const alunoForm: AdicionarNovoAlunoForm = {
        idGrupo: this.idGrupoSelecionado,
        nome: this.nome,
        sobrenome: this.sobrenome,
      };

      this.grupoService.adicionarNovoAluno(alunoForm).subscribe({
        next: (resposta) => {
          console.log(resposta);
          this.carregarGrupos();
          this.ModalAdicionarAluno = false;
          this.nome = '';
          this.sobrenome = '';
          this.salvando = false;
        },
        error: (err) => {
          this.salvando = false;
          console.error(err);
          console.log('DEU PAU AI');
          this.ModalAdicionarAluno = false;
          this.nome = '';
          this.sobrenome = '';
        },
      });
    } else {
      throw new Error('Erro: id do grupo não foi encontrado');
    }
  }

  fecharModalAluno() {
    this.ModalAdicionarAluno = false;
    this.nome = '';
    this.sobrenome = '';
  }



  /**
   * Alterna o tema visual da aplicação entre Claro e Escuro (Light/Dark Mode).
   * * <p>
   * Este método inverte o estado da propriedade `isDarkMode` e, com base nesse estado,
   * altera dinamicamente o atributo `data-bs-theme` na tag raiz do HTML (`<html>`).
   * * Ao injetar esse atributo no topo do DOM, ele aciona duas coisas simultaneamente:
   * 1. O suporte nativo de Dark Mode do Bootstrap 5.3+ (para botões, inputs, etc).
   * 2. O nosso CSS customizado (via `:host-context` e seletores globais) que foi
   * preparado para reagir a essa mudança de tema.
   * </p>
   */
  
  isDarkMode = false;

  alternarTema() {
    this.isDarkMode = !this.isDarkMode;
    const tema = this.isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', tema);
  }
}
