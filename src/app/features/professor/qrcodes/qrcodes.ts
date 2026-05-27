import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../shared/header/header';
import { timer } from 'rxjs';

@Component({
  selector: 'app-qrcodes',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './qrcodes.html',
  styleUrls: ['./qrcodes.css'],
})
export class QRCodesComponent implements OnInit {
  sessionCode = '';
  qrCodeDataUrl: string | null = null;
  isCopied = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.sessionCode = this.route.snapshot.queryParamMap.get('hash') || '';

    if (this.sessionCode) {
      this.gerarQRCode();
    }
  }

  gerarQRCode() {
    const domain = window.location.origin;
    const linkAluno = `${domain}/aluno/validar?hash=${this.sessionCode}`;

    this.qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(linkAluno)}`;
  }

  copiarLink() {
    const link = `${window.location.origin}/aluno/validar?hash=${this.sessionCode}`;

    navigator.clipboard.writeText(link).then(() => {
      alert('Link da sessão copiado!');
    });
  }

  copiarCodigo() {
    if (this.sessionCode) {
      navigator.clipboard
        .writeText(this.sessionCode)
        .then(() => {
          this.isCopied = true;
          timer(2000).subscribe(() => {
            this.isCopied = false;
          });
        })
        .catch((err) => {
          console.error('Falha ao copiar: ', err);
          this.isCopied = false;
        });
    }
  }
}
