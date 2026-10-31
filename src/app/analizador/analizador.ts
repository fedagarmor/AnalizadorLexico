import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Parser } from './parser/parser';
import * as d3 from 'd3';
import 'd3-graphviz';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  imports: [CommonModule,FormsModule,MatBadgeModule,MatTableModule,MatInputModule,MatFormFieldModule,MatButtonModule],
  selector: 'app-analizador',
  styleUrl: './analizador.css',
  templateUrl: './analizador.html',
})
export class Analizador {

  codigo:string = "";

  dataSource:any = [];

  errores:any = [];

  comentarios:any = []; // no van en la tabla de tokens, pero si se colorean

  codigoColoreado:string = ""; // HTML con colores que se dibuja detras del textarea

  erroresSintacticos:any = [];

  @ViewChild('graphContainer', { static: true }) graphContainer!: ElementRef;

  private parser:Parser;

  constructor(parser:Parser){
    this.parser = parser;
  }

  displayedColumns = ['token','lexema', 'fila', 'columna']

  palabrasReservadas = ['STACK','QUEUE','LIST','HASH','TREE','PUSH','POP','ENQUEUE','DEQUEUE',
                        'INSERT','REMOVE','SET','GET','ADDNODE','ROOT','LEFT','RIGHT','PRINT','GRAPH','<<','>>'];

  ConsoleOut = ['cout'];
  ConsoleIn = ['cin'];
  ExtractionOperator = ['>>'];
  Insertionoperator = ['<<'];
  
                        /*
    Estados del automata:
    A: estado inicial
    B: identificador o palabra reservada
    C: se leyo '/' (puede iniciar un comentario)
    D: comentario de una linea  //
    E: comentario de varias lineas  /* ... *\/
    F: dentro del comentario de varias lineas se leyo '*'
    G: literal numerico
    H: cadena de texto entre comillas dobles
  */
  tokenizar(){

    let fila = 1;
    let columna = 0;
    let estado = 'A';
    let lexema = "";
    let filaInicio = 1;
    let columnaInicio = 0;
    let texto = this.codigo+"\n";
    let simbolos = [...texto];
    this.dataSource = [];
    this.errores = [];
    this.comentarios = [];

    for(let i = 0; i < simbolos.length; i++){
      let s = simbolos[i];
      columna++;

      let codigo = s.charCodeAt(0);

      switch(estado){

        case 'A':
          if (this.esLetra(codigo)){
            lexema = s;
            filaInicio = fila;
            columnaInicio = columna;
            estado = 'B';
          }else if (this.esDigito(codigo)){
            lexema = s;
            filaInicio = fila;
            columnaInicio = columna;
            estado = 'G';
          }else{
            switch (codigo){
              case 47: // '/'
                lexema = s;
                filaInicio = fila;
                columnaInicio = columna;
                estado = 'C';
                break;
              case 34: // '"'
                lexema = s;
                filaInicio = fila;
                columnaInicio = columna;
                estado = 'H';
                break;
              case 61: // '='
              case 40: // '('
              case 41: // ')'
              case 44: // ','
              case 59: // ';'
              case 60: // <
              case 62: // >
                // operador: el token es el mismo simbolo, como en el enunciado
                this.dataSource.push(this.crearToken(s,s,fila,columna));
                break;
              case 10: //salto de linea
                fila++;
                columna = 0;
                break;
              case 32: //espacio
              case 9:  //tabulador
              case 13: //retorno de carro
                break;
              default:
                this.errores.push(this.crearError('Símbolo no reconocido',s,fila,columna));
                break;
            }
          }
          break;

        case 'B':
          if (this.esLetra(codigo) || this.esDigito(codigo) || codigo == 95){ // letra, digito o '_'
            lexema = lexema + s;
          }else{
            if (this.palabrasReservadas.includes(lexema)){
              // palabra reservada: el token es la misma palabra (STACK, PUSH, ...)
              this.dataSource.push(this.crearToken(lexema,lexema,filaInicio,columnaInicio));

              }else if (this.ConsoleOut.includes(lexema)){
                this.dataSource.push(this.crearToken('Console out',lexema,filaInicio,columnaInicio));

              }else if (this.ConsoleIn.includes(lexema)){
                this.dataSource.push(this.crearToken('Console in',lexema,filaInicio,columnaInicio)); 
                
              }else if (this.ExtractionOperator.includes(lexema)){
                this.dataSource.push(this.crearToken('Extraction operator',lexema,filaInicio,columnaInicio)); 
                
              }else if (this.Insertionoperator.includes(lexema)){
                this.dataSource.push(this.crearToken('Insertion operator',lexema,filaInicio,columnaInicio));   

            }else{
              this.dataSource.push(this.crearToken('ID',lexema,filaInicio,columnaInicio));
            }
            estado = 'A';
            i--;       // se vuelve a analizar este caracter en el estado A
            columna--;
          }
          break;

        case 'C':
          switch (codigo){
            case 47: // '/'
              lexema = lexema + s;
              estado = 'D';
              break;
            case 42: // '*'
              lexema = lexema + s;
              estado = 'E';
              break;
            default:
              this.errores.push(this.crearError('Símbolo no reconocido',lexema,filaInicio,columnaInicio));
              estado = 'A';
              i--;
              columna--;
              break;
          }
          break;

        case 'D':
          switch (codigo){
            case 10: //salto de linea: termina el comentario
              this.comentarios.push(this.crearToken('COMENTARIO',lexema,filaInicio,columnaInicio));
              estado = 'A';
              i--;
              columna--;
              break;
            default:
              lexema = lexema + s;
              break;
          }
          break;

        case 'E':
          switch (codigo){
            case 42: // '*'
              lexema = lexema + s;
              estado = 'F';
              break;
            case 10: //salto de linea dentro del comentario
              lexema = lexema + s;
              fila++;
              columna = 0;
              break;
            default:
              lexema = lexema + s;
              break;
          }
          break;

        case 'F':
          switch (codigo){
            case 47: // '/': termina el comentario
              lexema = lexema + s;
              this.comentarios.push(this.crearToken('COMENTARIO',lexema,filaInicio,columnaInicio));
              estado = 'A';
              break;
            case 42: // '*'
              lexema = lexema + s;
              break;
            default:
              estado = 'E';
              i--;
              columna--;
              break;
          }
          break;

        case 'G':
          if (this.esDigito(codigo)){
            lexema = lexema + s; // sigue leyendo el numero
          }else{
            this.dataSource.push(this.crearToken('NUMERO',lexema,filaInicio,columnaInicio));
            estado = 'A';
            i--;       // el caracter que corto el numero se analiza en A
            columna--;
          }
          break;

        case 'H':
          switch (codigo){
            case 34: // '"' cierra la cadena
              lexema = lexema + s;
              this.dataSource.push(this.crearToken('CADENA',lexema,filaInicio,columnaInicio));
              estado = 'A';
              break;
            case 10: // salto de linea: la cadena nunca se cerro
              this.errores.push(this.crearError('Cadena sin cerrar',lexema,filaInicio,columnaInicio));
              estado = 'A';
              i--;
              columna--;
              break;
            default:
              lexema = lexema + s;
              break;
          }
          break;
      }

    }

    // si el texto termino dentro de un comentario de varias lineas
    if (estado == 'E' || estado == 'F'){
      this.errores.push(this.crearError('Comentario sin cerrar',lexema,filaInicio,columnaInicio));
    }

    this.colorear(texto);

  }

  /*
    Boton Analizar: analisis lexico, luego el sintactico con Peggy.
    Si la entrada es valida se grafican las estructuras que tengan GRAPH.
  */
  analizar(){

    this.tokenizar();
    this.erroresSintacticos = [];

    // borra las graficas del analisis anterior
    let contenedor = d3.select(this.graphContainer.nativeElement);
    contenedor.selectAll('*').remove();

    try{
      let estructuras = this.parser.parse(this.codigo);
      this.graficarEstructuras(estructuras);
    }catch(e:any){
      let esperados:string[] = [];
      for (let x of e.expected ?? []){
        let texto = x.type == 'literal' ? x.text : x.description;
        if (!esperados.includes(texto)) esperados.push(texto);
      }
      let error:any = {};
      error.fila = e.location.start.line;
      error.columna = e.location.start.column;
      error.encontrado = e.found == null ? 'EOF' : e.found;
      error.descripcion = 'Se esperaba ' + esperados.join(' o ');
      this.erroresSintacticos.push(error);
    }

  }

  // dibuja debajo del editor cada estructura que tenga GRAPH, una despues de otra
  graficarEstructuras(estructuras:any){
    let contenedor = d3.select(this.graphContainer.nativeElement);
    for (let estructura of estructuras){
      if (estructura.graficar){
        let div = contenedor.append('div');
        div.append('h4').text(estructura.nombre);
        let grafo:any = div.append('div');
        grafo.graphviz().renderDot("digraph {" + this.codigoGraphviz(estructura) + "}");
      }
    }
  }

  /*
    Codigo de Graphviz de cada estructura (sin el "digraph { }").
    Pila: de arriba hacia abajo empezando por el tope.
    Cola: de izquierda a derecha, del primero al ultimo.
    Lista: igual que la cola pero con enlaces de ida y vuelta.
  */
  codigoGraphviz(estructura:any){

    let valores = estructura.valores;
    let codigo = "rankdir=LR;";

    if (estructura.tipo == "PILA"){
      valores = [...valores].reverse(); // el ultimo en entrar va arriba
      codigo = "rankdir=TB;";
    }

    for (let i = 0; i < valores.length; i++){
      codigo += 'n' + (i+1) + ' [label="' + valores[i] + '"];';
    }

    for (let i = 1; i < valores.length; i++){
      codigo += 'n' + i + ' -> n' + (i+1) + ';';
      if (estructura.tipo == "LISTA"){
        codigo += 'n' + (i+1) + ' -> n' + i + ';';
      }
    }

    return codigo;

  }

  /*
    Arma el HTML coloreado del editor. Junta tokens, comentarios y errores en orden
    de aparicion y envuelve cada lexema en un <span> con la clase de su color.
  */
  colorear(texto:string){

    let componentes = [...this.dataSource, ...this.comentarios, ...this.errores];
    componentes.sort((a:any, b:any) => a.fila - b.fila || a.columna - b.columna);

    let html = "";
    let pos = 0;

    for (let c of componentes){
      let inicio = texto.indexOf(c.lexema, pos);
      if (inicio < 0) continue;
      html += this.escaparHtml(texto.substring(pos, inicio)); // espacios y saltos entre tokens
      html += '<span class="' + this.claseColor(c) + '">' + this.escaparHtml(c.lexema) + '</span>';
      pos = inicio + c.lexema.length;
    }
    html += this.escaparHtml(texto.substring(pos));

    this.codigoColoreado = html;

  }

  claseColor(c:any){
    if (c.descripcion) return 'tk-error';
    if (this.palabrasReservadas.includes(c.token)) return 'tk-reservada';
    if (this.ConsoleOut.includes(c.token)) return 'tk-reservada';
    if (this.ConsoleIn.includes(c.token)) return 'tk-reservada';
    if (this.ExtractionOperator.includes(c.token)) return 'tk-reservada';
    if (this.Insertionoperator.includes(c.token)) return 'tk-reservada';
    switch (c.token){
      case 'ID': return 'tk-id';
      case 'NUMERO': return 'tk-numero';
      case 'CADENA': return 'tk-cadena';
      case 'COMENTARIO': return 'tk-comentario';
      case 'Console out': return 'tk-consoleout';
      case 'Console in': return 'tk-consolein';
      case 'Extraction operator': return 'tk-extraction';
      case 'Insertion operator': return 'tk-insertion';
      default: return 'tk-operador';
    }
  }

  escaparHtml(texto:string){
    return texto.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  esLetra(codigo:number){
    return (codigo >= 65 && codigo <= 90) || (codigo >= 97 && codigo <= 122) || codigo == 209 || codigo == 241;
  }

  esDigito(codigo:number){
    return codigo >= 48 && codigo <= 57;
  }

  crearToken(token:string, lexema:string, fila:number, columna:number){

    let objeto:any = {};
    objeto.token = token;
    objeto.lexema = lexema;
    objeto.fila = fila;
    objeto.columna = columna;

    return objeto;

  }

  crearError(descripcion:string, lexema:string, fila:number, columna:number){

    let objeto:any = {};
    objeto.descripcion = descripcion;
    objeto.lexema = lexema;
    objeto.fila = fila;
    objeto.columna = columna;

    return objeto;

  }

}
