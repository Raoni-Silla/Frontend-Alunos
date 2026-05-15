import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../shared/header/header';
import { RelatorioService } from '../../../services/relatorio.service';
import { AtividadeService } from '../../../services/atividade.service';
import { GrupoService } from '../../../services/grupo.service';
import { GruposDTO } from '../../../models/grupos-dto';

@Component({
  selector: 'app-atividade-grupos',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
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
        console.log("DADOS QUE CHEGARAM AI: " , dados)
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
}
