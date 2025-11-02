# M4F14 MAGIC

Pagina oficial de LIMTG (Liga Interna Magic: The Gathering)

## ¿Cuáles son los objetivos?

- [x] Contador de vidas
  - [x] Historial de vida
  - [x] Reiniciar partida
  - [x] Configuración de partida
  - [x] Guardar partida
  - [x] Cambiar los colores de los invocadores
  - [x] Cargar perfiles
  - [x] Timer integrado en el contador de vidas
    - [x] Cuando queden 10 segundos arranque alguna musica, puede ser algo como el soundtrack del C4 del counter y explote
- [x] Historial de partidas
- [x] Estadísticas
- [x] ABM invocadores
- [x] ABM decks
  - [x] Investigar cual es el mejor camino para integrar decks del magic
- [x] Hacer la home

- [x] Mejorar commander combobox UI
  - [x] Mostrar primero commanders que se hayan jugado
  - [x] En caso de que el player este seleccionado mostrar primero commanders que haya jugado el player ese

- [x] Guarda la imagen original en el historial, para mostrarlo al tocar la imagen. esto significaría guardar la foto orignal y la croppeed image, creo que es el mejor camino
  - [x] Arreglar mobile ui para subir imagenes

**Fixes**

- [x] Dates en history page no se muestran en el timezone local, revisar otros casos en los que se muestren dates.
- [x] Seleccionar commanders en el boton de magos no lo guarda para cuando se da al boton de guardar partida
- [x] La imagen de fondo de commander no está flipped
- [x] El drag de los jugadores en current-match no funciona en mobile a veces porque selecciona texto
- [x] Hubo un caso de que por alguna razon se queda eternamente reduciendole vida a un player porque ponele que le dio a restar vida y despues cambio de pagina o algo asi no entiendo bien que onda
- [x] Cambiar color del hp, y de los botones a blanco cuando se esté utilizando el background del commander
- [x] en current-match, bottom-toolbar son muchos botones hay que mandar un scroll horizontal (se podria matar el boton del timer y mezclar con las settings del boton del plus icon)
- [ ] En el ordenamiento automático de players según hp-history toma peor siempre a alguien que termina en -x que alguien que termina en 0 independientemente de cuando pasó
