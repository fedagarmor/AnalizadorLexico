import { Service } from '@angular/core';
import * as peggy from 'peggy';

@Service()
export class Parser {

  private parser!: peggy.Parser;

  constructor() {
    this.compileGrammar();
  }

  /*
    Cada declaracion agrega una estructura al arreglo y cada operacion
    busca la estructura por su nombre y modifica sus valores.
    Al final se devuelve el arreglo (el JSON que se usa para graficar).
  */
  compileGrammar() {
    const grammar = `
{
 let estructuras = [];
}

INICIO = SENTENCIAS {
    return estructuras;
}

SENTENCIAS = _ SENTENCIA _ SENTENCIAS
          /_ SENTENCIA _


SENTENCIA = "STACK" _ nom:Identificador _ ";" {
      let estructura = {};
      estructura.nombre = nom;
      estructura.tipo = "PILA";
      estructura.valores = [];
      estructura.graficar = false;
      estructuras.push(estructura);
}
            / "QUEUE" _ nom:Identificador _ ";" {
              let estructura = {};
              estructura.nombre = nom;
              estructura.tipo = "COLA";
              estructura.valores = [];
              estructura.graficar = false;
              estructuras.push(estructura);
            }
            / "LIST" _ nom:Identificador _ ";" {
              let estructura = {};
              estructura.nombre = nom;
              estructura.tipo = "LISTA";
              estructura.valores = [];
              estructura.graficar = false;
              estructuras.push(estructura);
            }
            / "PUSH" _ "(" _ nom:Identificador _ "," _ val:VALOR _ ")" _ ";"{
              for(let estructura of estructuras){
                if(estructura.nombre == nom){
                  estructura.valores.push(val);
                }
              }
            }
            / "POP" _ "(" _ nom:Identificador _ ")" _ ";"{
              for(let estructura of estructuras){
                if(estructura.nombre == nom){
                  estructura.valores.pop(); // sale el ultimo que entro
                }
              }
            }
            / "ENQUEUE" _ "(" _ nom:Identificador _ "," _ val:VALOR _ ")" _ ";"{
              for(let estructura of estructuras){
                if(estructura.nombre == nom){
                  estructura.valores.push(val);
                }
              }
            }
            / "DEQUEUE" _ "(" _ nom:Identificador _ ")" _ ";"{
              for(let estructura of estructuras){
                if(estructura.nombre == nom){
                  estructura.valores.shift(); // sale el primero que entro
                }
              }
            }
            / "INSERT" _ "(" _ nom:Identificador _ "," _ val:VALOR _ ")" _ ";"{
              for(let estructura of estructuras){
                if(estructura.nombre == nom){
                  estructura.valores.push(val);
                }
              }
            }
            / "REMOVE" _ "(" _ nom:Identificador _ "," _ val:VALOR _ ")" _ ";"{
              for(let estructura of estructuras){
                if(estructura.nombre == nom){
                  let posicion = estructura.valores.indexOf(val);
                  if(posicion >= 0){
                    estructura.valores.splice(posicion,1);
                  }
                }
              }
            }
            / "GRAPH" _ "(" _ nom:Identificador _ ")" _ ";"{
              for(let estructura of estructuras){
                if(estructura.nombre == nom){
                  estructura.graficar = true;
                }
              }
            }

VALOR = num:numero{
    return num;
}
      / cad:cadena {
        return cad;
      }

//Expresiones regulares (con nombre para que el error diga "identificador" y no [a-zA-Z_])
Identificador "identificador" = a:[a-zA-Z_] b:[a-zA-Z0-9_]* {
    return a + b.join("");
}

numero "numero" = c:[0-9]+ {
    return c.join("");
}

cadena "cadena" = "\\"" c:[^\\"]* "\\"" {
    return c.join("");
}

// Ignora espacios y comentarios
_ "espacio" = (Blancos / Comentario)*

Blancos = [ \\t\\n\\r]+

Comentario = "//" [^\\n]* ("\\n" / !.)
           / "/*" (!"*/" .)* "*/"
`;
    this.parser = peggy.generate(grammar);

  }

  parse(texto: string): any {
    return this.parser.parse(texto);
  }

}
