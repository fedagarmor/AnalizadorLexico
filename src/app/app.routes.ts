import { Routes } from '@angular/router';
import { Analizador } from './analizador/analizador';
import { Grafica } from './grafica/grafica';

export const routes: Routes = [
    {path:"",component:Analizador},
    {path:"grafo",component:Grafica}
];
