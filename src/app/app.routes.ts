import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  {
    path: '',
    loadChildren: () => import('./start/start.module').then(m => m.StartModule)
  },
  {
    path: 'credits',
    loadChildren: () => import('./credits/credits.module').then(m => m.CreditsModule)
  },
  {
    path: 'game',
    loadChildren: () => import('./game/game.module').then(m => m.GameModule)
  }
];
