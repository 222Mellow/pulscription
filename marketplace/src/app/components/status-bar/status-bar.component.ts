import { Component } from '@angular/core';
import { AsyncPipe, DecimalPipe, JsonPipe, NgTemplateOutlet } from '@angular/common';

import { Store } from '@ngrx/store';
import { GlobalState } from '@/models/global-state';
import * as appStateSelectors from '@/state/selectors/app-state.selectors';

import { GasService } from '@/services/gas.service';
import { LogItem, SocketService } from '@/services/socket.service';

import { LoggerComponent } from '@/components/status-bar/logger/logger.component';

import { combineLatest, scan, startWith, switchMap, take } from 'rxjs';

import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [
    AsyncPipe,
    JsonPipe,
    DecimalPipe,
    NgTemplateOutlet,

    LoggerComponent
  ],
  templateUrl: './status-bar.component.html',
  styleUrl: './status-bar.component.scss',
})
export class StatusBarComponent {

  blocks$ = combineLatest([
    this.store.select(appStateSelectors.selectCurrentBlock),
    this.store.select(appStateSelectors.selectIndexerBlock),
  ]);

  logs$ = this.socketSvc.logs$.pipe(
    take(1),
    switchMap((logs: LogItem[]) => {
      // console.log('logs', logs);
      return this.socketSvc.log$.pipe(
        startWith(...logs),
        scan((acc: LogItem[], log: LogItem) => [...acc, log], []),
      )
    })
  );

  chain = environment.chainId;

  levels: any = {
    0: 'sync',
    1: 'behind1',
    2: 'behind2',
    3: 'behind3'
  };

  expanded = false;

  constructor(
    private store: Store<GlobalState>,
    public gasSvc: GasService,
    private socketSvc: SocketService
  ) {}

  expandCollapse() {
    this.expanded = !this.expanded;
  }
}
