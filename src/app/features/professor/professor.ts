import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../shared/header/header';
import { ModalComponent } from '../../shared/modal/modal';
import { AtividadeService } from '../../services/atividade.service';
import { RegistroForm } from '../../models/registro-form';

@Component({
  selector: 'app-professor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, ReactiveFormsModule],
  templateUrl: './professor.html',
  styleUrls: ['./professor.css'],
})
export class ProfessorComponent implements OnInit {
  atividadeForm!: FormGroup;

  sessions: any[] = [];
  mostrarToast = false;

  groupCount: number = 1;
  totalAlunos: number | null = null;
  mostrarCalculo = false;
  distribuicao: number[] = [];

  mostrarModalExcluir = false;
  sessionSelecionada: any = null;

  constructor(
    private fb: FormBuilder,
    private atividadeService: AtividadeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.atividadeForm = this.fb.group({
      descricaoAtividade: ['', Validators.required],
      quantidadeTotalGrupos: [null, [Validators.required, Validators.min(1)]],
      quantidadeTotalAlunosSala: [null, [Validators.required, Validators.min(1)]],
      grupoForm: this.fb.array([]),
    });

    this.atualizarGrupos();
  }

  get grupoForm(): FormArray {
    return this.atividadeForm.get('grupoForm') as FormArray;
  }

  atualizarGrupos(): void {
    const quantidade = this.atividadeForm.get('quantidadeTotalGrupos')?.value || 0;

    this.grupoForm.clear();

    for (let i = 0; i < quantidade; i++) {
      this.grupoForm.push(
        this.fb.group({
          nomeGrupo: ['', Validators.required],
          atividade: this.atividadeForm.get('descricaoAtividade') as FormArray,
          quantidadeMaximaAluno: [0],
        }),
      );
    }

    this.calcularDistribuicao();
    this.calcularDistribuicao2();
  }

  calcularDistribuicao(): void {
    const totalAlunos = this.atividadeForm.get('quantidadeTotalAlunosSala')?.value || 0;

    const totalGrupos = this.atividadeForm.get('quantidadeTotalGrupos')?.value || 1;

    const base = Math.floor(totalAlunos / totalGrupos);
    const resto = totalAlunos % totalGrupos;

    this.grupoForm.controls.forEach((grupo, index) => {
      const quantidadeCalculada = base + (index < resto ? 1 : 0);

      grupo.patchValue({
        quantidadeAlunos: quantidadeCalculada,
        quantidadeMaximaAluno: quantidadeCalculada,
      });
    });
  }

  criarSessao(): void {
    if (this.atividadeForm.invalid) {
      this.atividadeForm.markAllAsTouched();
      return;
    }

    const payload: RegistroForm = {
      descricaoAtividade: this.atividadeForm.value.descricaoAtividade,

      quantidadeTotalAlunosSala: this.atividadeForm.value.quantidadeTotalAlunosSala,

      grupoForm: this.grupoForm.value,
    };

    this.mostrarToast = true;

    this.atividadeService.criarAtividade(payload).subscribe({
      next: () => {
        setTimeout(() => {
          this.router.navigate(['/professor/atividade']);
        }, 1500);
      },
      error: (err) => {
        console.error('Erro ao criar atividade', err);
      },
    });
  }

  get baseAlunos(): string {
    return ((this.totalAlunos || 0) / this.groupCount).toFixed(2);
  }

  calcularDistribuicao2(): void {
    const totalAlunos = this.atividadeForm.get('quantidadeTotalAlunosSala')?.value;

    const totalGrupos = this.atividadeForm.get('quantidadeTotalGrupos')?.value || 1;

    if (!totalAlunos || totalAlunos < 1) {
      this.mostrarCalculo = false;
      this.distribuicao = [];
      return;
    }

    const base = Math.floor(totalAlunos / totalGrupos);
    const sobra = totalAlunos % totalGrupos;

    this.distribuicao = Array.from({ length: totalGrupos }, (_, i) =>
      i < sobra ? base + 1 : base,
    );

    this.groupCount = totalGrupos;
    this.totalAlunos = totalAlunos;
    this.mostrarCalculo = true;
  }
}
