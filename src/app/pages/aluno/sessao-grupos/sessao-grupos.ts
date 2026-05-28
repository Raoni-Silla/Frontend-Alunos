import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../shared/header/header';
import { GrupoService } from '../../../services/grupo.service';
import { GruposDTO } from '../../../models/grupos-dto';
import { GrupoUsuario } from '../../../models/grupo-usuario';

@Component({
  selector: 'app-sessao-grupos',
  standalone: true,
  templateUrl: './sessao-grupos.html',
  styleUrls: ['./sessao-grupos.css'],
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent],
})
export class SessaoGruposComponent implements OnInit {
  usuario: GrupoUsuario | null = null;

  grupos: GruposDTO[] = [];

  grupoSelecionadoId: number | null = null;
  nomeGrupoSelecionado = '';
  nomeAtividade = '';

  ModalConfirmacao = false;
  ModalSucesso = false;
  ModalErro = false;
  ModalRandom = false;

  constructor(
    private router: Router,
    private grupoService: GrupoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const usuarioSalvo = localStorage.getItem('usuario');

    if (usuarioSalvo) {
      this.usuario = JSON.parse(usuarioSalvo);
    }

    setTimeout(() => {
      this.carregarGrupos();
    });
  }

  carregarGrupos() {
    this.grupoService.listarTodosGrupos().subscribe({
      next: (dados) => {
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
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  abrirConfirmacao(grupo: GruposDTO) {
    this.grupoSelecionadoId = grupo.idGrupo;
    this.nomeGrupoSelecionado = grupo.nomeGrupo;
    this.ModalConfirmacao = true;
  }

  confirmarGrupo() {
    if (!this.grupoSelecionadoId || !this.usuario) return;

    const grupoAtual = this.grupos.find((g) => g.idGrupo === this.grupoSelecionadoId);
    const proximaPosicao = grupoAtual ? grupoAtual.usuarios.length + 1 : 1;

    const dados = {
      idUsuario: this.usuario.idUsuario,
      idGrupo: this.grupoSelecionadoId,
      posicao: proximaPosicao,
    };

    this.ModalConfirmacao = false;

    this.grupoService.entrarGrupo(dados).subscribe({
      next: () => {
        this.ModalSucesso = true;

        this.cdr.detectChanges();

        setTimeout(() => {
          window.location.reload();
        }, 2500);
      },
      error: () => {
        this.ModalErro = true;

        this.cdr.detectChanges();

        setTimeout(() => {
          window.location.reload();
        }, 2500);
      },
    });
  }

  /**
   * Sorteia aleatoriamente um grupo com vagas disponíveis e prepara o modal de confirmação.
   * 
   * O método verifica a lista de grupos e filtra apenas aqueles onde a quantidade
   * atual de usuários é menor que a capacidade máxima (qtdePessoas).
   * 
   * Comportamentos:
   * - Caso todos os grupos estejam cheios: Exibe o modal de erro (ModalErro).
   * - Caso haja vagas: Seleciona um grupo de forma aleatória, armazena seu ID e nome
   *   no estado do componente, e aciona o modal de confirmação para o usuário (ModalRandom).
   * 
   * @returns {void} Não retorna nenhum valor, apenas altera o estado visual do componente.
   */
 
  abrirConfirmacaoEntradaAleatoria() {
    const gruposComVaga = this.grupos.filter((grupo) => grupo.qtdeUsuarios < grupo.qtdePessoas);
    if (gruposComVaga.length === 0) {
     this.ModalErro = true;
      setTimeout(() => {
        this.ModalErro = false;
        this.cdr.detectChanges(); 
      }, 2500);
       
      this.cdr.detectChanges();
      return; 
    }

    console.log(gruposComVaga);

    const indiceSorteado = Math.floor(Math.random() * gruposComVaga.length);
    const grupoSorteado = gruposComVaga[indiceSorteado];

    this.grupoSelecionadoId = grupoSorteado.idGrupo;
    this.nomeGrupoSelecionado = grupoSorteado.nomeGrupo;

    this.ModalRandom = true;
  }
}
