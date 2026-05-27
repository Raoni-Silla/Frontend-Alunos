import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GruposDTO } from '../models/grupos-dto';
import { GrupoUsuario } from '../models/grupo-usuario';
import { ConfigService } from './config.service';
import { moverAlunoForm } from '../models/MoverAlunoForm';
import { AdicionarNovoAlunoForm } from '../models/AdicionarNovoAlunoForm';

@Injectable({
  providedIn: 'root',
})
export class GrupoService {
  private api!: string;
  private api2!: string;

  constructor(
    private http: HttpClient,
    private config: ConfigService,
  ) {
    this.api = this.config.getApi('grupos');
    this.api2 = this.config.getApi('grupos-usuarios');
  }

  buscarGrupo(idGrupo: number): Observable<GruposDTO> {
    return this.http.get<GruposDTO>(`${this.api}/${idGrupo}`);
  }

  listarTodosGrupos(): Observable<GruposDTO[]> {
    return this.http.get<GruposDTO[]>(this.api);
  }

  entrarGrupo(dados: GrupoUsuario) {
    return this.http.post(`${this.api2}/mover`, dados);
  }

  resetarTodosGrupos() {
    return this.http.post(`${this.api2}/reset-posicoes`, {});
  }

  resetarGrupo(idGrupo: number) {
    return this.http.post(`${this.api2}/${idGrupo}/reset-posicoes`, {});
  }

  moverAluno(moverAlunoForm : moverAlunoForm){
    return this.http.post(`${this.api2}/mover-aluno-grupo`, moverAlunoForm)
  }

  adicionarNovoAluno(novoAlunoForm: AdicionarNovoAlunoForm){
    return this.http.post(`${this.api2}/adicionar-aluno`,novoAlunoForm)
  }

}
