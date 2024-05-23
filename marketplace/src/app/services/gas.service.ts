import { Injectable } from '@angular/core';
import { Socket, SocketIoConfig } from 'ngx-socket-io';
import { tap } from 'rxjs';

import { environment } from 'src/environments/environment';

export interface GasData {
  FastGasPrice: string;
  LastBlock: string;
  ProposeGasPrice: string;
  SafeGasPrice: string;
  gasUsedRatio: string;
  suggestBaseFee: string;
}

const socketConfig: SocketIoConfig = {
  url: 'https://flooredApe.io',
  options: {
    path: '/api/v1/socket.io/'
  }
};

@Injectable({
  providedIn: 'root',
})
export class GasService extends Socket {

  gas$ = this.fromEvent<any>('gasData');

  constructor() {
    super(socketConfig);
  }

  connect(callback?: ((err: any) => void) | undefined) {
    super.connect(callback);
  }
}