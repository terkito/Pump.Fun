from PIL import Image, ImageDraw, ImageFont
import random
import os

# Mensaje que siempre debe mostrar la imagen
mensaje = "Telegram Group @markpay1"

# Obtener la ruta del directorio donde está el script
directorio_base = os.path.dirname(os.path.abspath(__file__))

# Ruta donde se guardarán las imágenes
directorio_guardado = os.path.join(directorio_base, "imagenes")

# Verificar si el directorio existe, si no, crearlo
if not os.path.exists(directorio_guardado):
    os.makedirs(directorio_guardado)
    print(f"Directorio {directorio_guardado} creado.")

# Función para eliminar imágenes previas
def limpiar_imagenes():
    imagenes_en_carpeta = [f for f in os.listdir(directorio_guardado) if f.endswith(".gif")]
    for imagen in imagenes_en_carpeta:
        os.remove(os.path.join(directorio_guardado, imagen))
        print(f"Imagen {imagen} eliminada.")

# Función para generar una imagen GIF
def generar_imagen():
    try:
        # Eliminar imágenes previas antes de generar una nueva
        limpiar_imagenes()
        
        # Generar tamaño de imagen aleatorio entre 400x200 y 1000x500
        width = random.randint(400, 1000)
        height = random.randint(200, 500)
        
        # Crear una lista de cuadros para la animación
        frames = []
        
        # Definir el número de cuadros para la animación (aleatorio entre 5 y 10 cuadros)
        num_frames = random.randint(5, 10)

        for i in range(num_frames):  # Crear cuadros con diferentes estilos
            imagen = Image.new('RGB', (width, height), color=(random.randint(50, 200), random.randint(50, 200), random.randint(50, 200)))
            dibujar = ImageDraw.Draw(imagen)

            # Seleccionar tamaño de fuente aleatorio
            fuente_tamano = random.randint(40, 80)
            try:
                fuente = ImageFont.truetype("arial.ttf", fuente_tamano)
            except IOError:
                fuente = ImageFont.load_default()

            # Calcular tamaño del texto para centrarlo
            bbox = dibujar.textbbox((0, 0), mensaje, font=fuente)
            texto_width = bbox[2] - bbox[0]
            texto_height = bbox[3] - bbox[1]

            # Ajustar tamaño de fuente si es necesario
            while texto_width > width - 40:
                fuente_tamano -= 5
                fuente = ImageFont.truetype("arial.ttf", fuente_tamano)
                bbox = dibujar.textbbox((0, 0), mensaje, font=fuente)
                texto_width = bbox[2] - bbox[0]
                texto_height = bbox[3] - bbox[1]

            x = (width - texto_width) // 2
            y = (height - texto_height) // 2

            # Crear un borde con grosor y color aleatorio
            grosor_borde = random.randint(5, 20)
            color_borde = (random.randint(100, 255), random.randint(0, 255), random.randint(0, 255))

            # Cambiar estilo del borde (rectángulo, ovalado o líneas)
            estilo_borde = random.choice(['rectangle', 'ellipse', 'line'])

            if estilo_borde == 'rectangle':
                dibujar.rectangle([(10, 10), (width - 10, height - 10)], outline=color_borde, width=grosor_borde)
            elif estilo_borde == 'ellipse':
                dibujar.ellipse([(10, 10), (width - 10, height - 10)], outline=color_borde, width=grosor_borde)
            else:
                for _ in range(random.randint(3, 6)):
                    x1 = random.randint(10, width - 10)
                    y1 = random.randint(10, height - 10)
                    x2 = random.randint(10, width - 10)
                    y2 = random.randint(10, height - 10)
                    dibujar.line([(x1, y1), (x2, y2)], fill=color_borde, width=grosor_borde)

            # Agregar sombra al texto de manera aleatoria
            sombra_offset = random.randint(2, 5)
            dibujar.text((x + sombra_offset, y + sombra_offset), mensaje, font=fuente, fill=(0, 0, 0))

            # Escribir el texto
            dibujar.text((x, y), mensaje, font=fuente, fill=(255, 255, 255))

            # Agregar el cuadro a la lista de frames
            frames.append(imagen)

        # Nombre fijo para la imagen para que siempre reemplace la anterior
        archivo_gif = os.path.join(directorio_guardado, "imagen.gif")

        # Guardar la animación como un GIF
        frames[0].save(archivo_gif, save_all=True, append_images=frames[1:], duration=random.randint(100, 300), loop=0)

        print(f"Imagen generada y guardada como {archivo_gif}")
        return archivo_gif

    except Exception as e:
        print(f"Error generando la imagen: {e}")
        return None

# Ejecutar la función una vez
generar_imagen()

