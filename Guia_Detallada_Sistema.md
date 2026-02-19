# Guía Funcional Detallada del Sistema

Esta guía describe el funcionamiento interno, la lógica de negocio y el mapeo de datos de cada módulo del sistema. Está diseñada para que cualquier persona pueda entender qué hace cada botón y de dónde proviene la información.

---

## 1. Módulo: Accounts (Cuentas)

Este módulo permite gestionar las cuentas de juego asociadas al sistema. Es la base para la organización de personajes y recursos.

### 1.1 Vista Principal: Tabla de Cuentas
Muestra un resumen de todas las cuentas registradas.

| Nombre Campo | Función / Descripción | Origen DB | Editable |
| :--- | :--- | :--- | :--- |
| **N°** | Número identificador de la cuenta (usado para ordenamiento). | `accounts.number` | Sí (vía Edit) |
| **Email** | Correo electrónico asociado a la cuenta de juego. | `accounts.email` | Sí (vía Edit) |
| **Tag** | Etiqueta personalizada (ej. Main, Bossing, Mule). | `accounts.tag` | Sí (vía Edit) |
| **Created** | Fecha de creación del registro (formato d/m/yyyy). | `accounts.created_at` | **No** (Automático) |

### 1.2 Botones de la Vista Principal

#### 1.2.1 Botón: + New Account
*   **Función**: Abre el modal para crear una nueva cuenta.
*   **Lógica**: Inicializa todos los campos en blanco o valores por defecto (N°: 0).

#### 1.2.2 Botón: Edit (en cada fila)
*   **Función**: Abre el modal **Edit Account** cargando los datos de la fila seleccionada.
*   **Lógica**: Recupera los valores actuales de `accounts` para precargar el formulario.

---

### 1.3 Modal: Edit / New Account

#### 1.3.1 Campos del Formulario

| Nombre Campo | Función / Descripción | Origen DB | Editable |
| :--- | :--- | :--- | :--- |
| **N°** | Identificador numérico. Requerido. | `accounts.number` | Sí |
| **Email** | Correo de la cuenta. | `accounts.email` | Sí |
| **Tag** | Etiqueta descriptiva. | `accounts.tag` | Sí |

#### 1.3.2 Botones del Modal

*   **Boton Save Changes / Create Account**:
    *   **Función**: Guarda los datos en la base de datos.
    *   **Lógica**: Ejecuta un `INSERT` (si es nueva) o `UPDATE` (si es edición) en la tabla `accounts`. Sobrescribe Name, Email y Tag.
*   **Boton Cancel**:
    *   **Función**: Cierra el modal.
    *   **Lógica**: No realiza ningún cambio ni actualización en la DB.
*   **Boton Delete (Solo en Edit)**:
    *   **Función**: Elimina el registro de la cuenta.
    *   **Lógica**: 
        1. Genera un pop-up de confirmación: "¿Estás seguro de eliminar esta cuenta?".
        2. Si se confirma, ejecuta `DELETE` en la tabla `accounts` para el ID seleccionado.
        3. Si se cancela, no realiza ninguna acción.

---

## 2. Módulo: Characters (Personajes)

Gestión de los personajes de juego vinculados a cada cuenta.

### 2.1 Vista Principal: Tabla de Personajes

| Nombre Campo | Función / Descripción | Origen DB | Editable |
| :--- | :--- | :--- | :--- |
| **Account N°** | Número de la cuenta a la que pertenece el personaje. | `accounts.number` | Sí (vía Edit) |
| **Email** | Email de la cuenta propietaria. | `accounts.email` | Sí (vía Edit) |
| **Name** | Nombre del personaje en el juego. | `characters.name` | Sí (vía Edit) |
| **Level** | Nivel actual del personaje. | `characters.level` | Sí (vía Edit) |
| **Job** | Arquetipo de clase (Warrior, Magician, etc.). | `characters.job` | Sí (vía Edit) |
| **Class** | Clase específica del personaje. | `characters.class` | Sí (vía Edit) |
| **Type** | Clasifica si es "Main" o "Mule". | `characters.main` | Sí (vía Edit) |

> [!NOTE]
> **Lógica de Columna "Type"**: Se muestra como "Main" si `characters.main` es 'Main' O si el `accounts.number` es 0. De lo contrario, se muestra como "Mule".

### 2.2 Filtros de la Vista
*   **Botones de Job (Warrior, Thief, etc.)**: Filtran la lista por la clase seleccionada.
*   **Botón Show Mains Only**: Filtra la tabla mostrando solo personajes marcados como Main o pertenecientes a la Cuenta N° 0.

---

### 2.3 Modal: Edit / New Character

#### 2.3.1 Campos del Formulario

| Nombre Campo | Función / Descripción | Origen DB | Detalles |
| :--- | :--- | :--- | :--- |
| **Account** | Selector de cuenta propietaria. | `characters.account_id` | Muestra "N° [X] - [Email]". |
| **Name** | Nombre del personaje. | `characters.name` | Requerido. |
| **Level** | Nivel (1-300). | `characters.level` | Valor por defecto: 1. |
| **Job** | Selector de arquetipo. | `characters.job` | Al cambiarlo, filtra las opciones de "Class". |
| **Class** | Selector de clase específica. | `characters.class` | Depende del "Job" seleccionado. |

#### 2.3.2 Botones del Modal
*   **Boton Save Changes / Create**: Ejecuta `INSERT` o `UPDATE` en la tabla `characters`.
*   **Boton Cancel**: Cierra sin guardar.
*   **Boton Delete**: Elimina el registro de la tabla `characters` previa confirmación.

---

## 3. Módulo: Items (Objetos)

Módulo central para la gestión del inventario, costos de producción y ventas.

### 3.1 Vista Principal: Tabla de Ítems

| Nombre Campo | Función / Descripción | Origen DB | Editable |
| :--- | :--- | :--- | :--- |
| **Asset** | Imagen y nombre del ítem. El nombre proviene de un catálogo predefinido. | `items.name` | Sí (vía Edit) |
| **Account** | Email de la cuenta propietaria del personaje que tiene el ítem. | `accounts.email` | **No** (Relacional) |
| **Owner** | Nombre del personaje que posee el ítem. | `characters.name` | Sí (vía Edit) |
| **Status** | Estado actual (Bulk, In Stock, For Sale, Sold, Service). | `items.status` | Sí (vía Edit) |
| **Estimated Value** | Valor de mercado estimado o precio de venta objetivo. | `items.estimated_value` | **Sí (Edición Rápida)** |
| **Costo Total** | Suma de todos los costos (Base + Cubos + SF + scrolls). | `items.costo_total` | **No** (Calculado) |
| **SF / Trade** | Estrellas de Star Force y slots de venta restantes. | `items.star_force` / `items.remaining_trade_slots` | Sí (vía Edit) |

### 3.2 Lógicas Especiales de la Tabla

*   **Edición de Precio Rápida**: La columna "Estimated Value" permite cambiar el valor directamente en la tabla. Al perder el foco (blur), se ejecuta un `UPDATE` en `items.estimated_value`.
*   **Cálculo de Costo Total (Fórmula)**: 
    `costo_total = costo_item + costo_cubos + costo_psok + costo_sf + costo_perfect_innoc + costo_guardian_scroll + costo_replacement`
*   **Colores de Estado**:
    *   `Bulk`: Gris.
    *   `In Stock`: Verde.
    *   `For Sale`: Azul.
    *   `Sold`: Rojo.

---

### 3.3 Modal: New / Edit Item

Este modal incluye lógica de automatización avanzada (OCR).

#### 3.3.1 Sección: Adquisición (Solo en New)
Permite definir cómo se obtuvo el ítem para descontar el costo automáticamente.
*   **Opción: Drop**: El `costo_item` se inicializa en 0.
*   **Opción: Purchase**:
    *   Si se paga con **Mesos**: Se selecciona la cuenta (o Shared Vault) y se descuenta el monto de `accounts.mesos_b`. Se crea una transacción en `transactions_mesos`.
    *   Si se paga con **Dinero Real**: Se selecciona la cuenta financiera. El sistema usa la tabla `exchange_rates` para convertir el pago a Mesos y asignarlo al `costo_item`. Se crea una transacción en `transactions`.

#### 3.3.2 Función: OCR (Paste Zone)
*   **Acción**: Al hacer clic en "Click & Paste" y presionar Ctrl+V con una imagen del juego en el portapapeles.
*   **Lógica**: Utiliza `Tesseract.js` para leer el texto de la imagen.
    *   **Nombre**: Busca coincidencias exactas en la tabla `items_db`.
    *   **Star Force**: Cuenta los caracteres '★' o '*' en la parte superior.
    *   **Potenciales**: Detecta el Tier (Legendary, Unique, etc.) y las 3 líneas de potencial principal y bonus.
    *   **Tradeability**: Detecta si es "Tradeable Once", "Untradeable", etc.

---

### 3.4 Botones de Acción de Ítem

*   **Botón Cube (Daga)**:
    *   **Función**: Redirige al **Upgrade Workspace V2**.
    *   **Lógica**: Pasa el `itemId` y `accountId` por estado de navegación para pre-cargar el espacio de trabajo.
*   **Botón Sell (Dólar)**:
    *   **Función**: Abre el modal de venta.
    *   **Lógica (Sale Type: Client)**:
        1. Crea un registro en `accounts_receivable` (Cuenta por cobrar).
        2. Crea una transacción vinculada.
        3. Cambia el estado del ítem a `Sold`.
*   **Botón Copy (Papeles)**:
    *   **Función**: Crea un nuevo ítem basado en el actual.
    *   **Lógica**: Mantiene stats y potenciales, pero obliga a seleccionar un nuevo dueño y re-confirmar el costo.

---

## 4. Módulo: Accounts Receivable (Clientes)

Gestión de ventas a crédito y seguimiento de pagos de clientes.

### 4.1 Vista Principal: Tabla de Deudas

| Nombre Campo | Función / Descripción | Origen DB | Editable |
| :--- | :--- | :--- | :--- |
| **Date** | Fecha de la venta. | `accounts_receivable.created_at` | No |
| **Client** | Nombre del cliente. | `clients.name` | No |
| **Item** | Nombre del ítem vendido. | `items.name` | No |
| **Sale Price** | Precio acordado en USD. | `accounts_receivable.amount` | No |
| **Paid** | Monto total abonado hasta la fecha. | `accounts_receivable.paid` | No |
| **Balance** | Deuda restante (Sale Price - Paid). | Calculado | No |
| **Status** | Indica si está "Pending" o "Paid". | Calculado | No |

### 4.2 Lógica de Pago (Botón Register Payment)
*   **Campo "Amount to Pay"**: Monto que el cliente entrega hoy.
*   **Campo "Meso Rate"**: Cotización usada para la conversión (si aplica).
*   **Efecto**:
    1. Actualiza `accounts_receivable.paid` sumando el nuevo monto.
    2. Si `paid >= amount`, marca el registro como completado.
    3. Crea una transacción de ingreso (`income`) en la cuenta financiera seleccionada.

---

## 5. Módulo: Finance (Finanzas)

Control central de flujos de caja en dinero real (USD/Soles/etc.) y moneda del juego (Mesos).

### 5.1 Vistas: Financial vs Mesos
El módulo cambia entre dos contextos mediante pestañas:
1.  **Financial Accounts**: Muestra saldos en cuentas bancarias/billeteras. Utiliza `transactions`.
2.  **Mesos (b)**: Muestra el stock de Mesos en Billones por cuenta de juego y en el Shared Vault. Utiliza `transactions_mesos`.

### 5.2 Lógica de KPIs (Resumen Superior)
*   **Total Income / Expense**: Se calculan sumando el monto de las transacciones filtradas.
*   **Conversión a USD**: Si una transacción no está en USD, el sistema busca el valor en `exchange_rates` para normalizar el KPI.
    *   *Fórmula*: `Valor_USD = Monto_Original * getRate(Moneda_Original -> USD)`

### 5.3 Lógica Especial: Exchange Mesos (Botón)
Permite registrar la compra/venta de Mesos por dinero real.
*   **Compra (Buy Mesos)**:
    1. Resta saldo de la Cuenta Financiera (`expense`).
    2. Suma saldo a la Cuenta de Juego (`income` en Mesos).
    3. **Trade Fee (5%)**: Crea automáticamente un gasto de Mesos del 5% del monto comprado para reflejar la comisión del juego.
*   **Venta (Sell Mesos)**:
    1. Resta Mesos de la Cuenta de Juego (`expense`).
    2. Suma saldo a la Cuenta Financiera (`income`).

---

## 6. Módulo: Upgrade Workspace V2 (Taller de Cubing)

El módulo más complejo del sistema, donde se transforman recursos en valor de ítem.

### 6.1 Pantalla de Trabajo
Muestra el ítem seleccionado, sus stats actuales y el consumo de recursos de la sesión activa.

### 6.2 Lógica de Consumo de Recursos (Botón Use)
Al usar un recurso (Cubo, PSOK, Scroll), se abre un modal de confirmación con 4 métodos:
*   **Stock**: Resta 1 unidad de la columna del recurso en `accounts`.
*   **RP (Reward Points)**: Resta el costo en puntos de la columna `reward_points` en `accounts`.
*   **Mesos**: Resta el costo en Mesos del saldo de la cuenta O del Shared Vault. Crea una transacción de gasto.
*   **Gift**: No resta saldo (cortesía o regalo), pero registra el evento.

### 6.3 Lógica de Finalización de Sesión (Botón Finalize)
Calcula la deuda final del cliente y actualiza el sistema.

#### **Caso Especial: Cliente "Alvaro"**
*   **Lógica**: No genera Deuda (Account Receivable).
*   **Efecto**: Los costos de los recursos usados se suman directamente a las columnas `costo_psok`, `costo_cubos`, etc., del ítem, incrementando su `costo_total` interno para seguimiento de inversión propia.

#### **Caso General: Otros Clientes**
Genera una deuda en el módulo de **Accounts Receivable**.
*   **Fórmula de Deuda Final (USD)**:
    `Total_AR = (Session_Total_Mesos * Meso_Rate) + (Item_Cost_Mesos * Meso_Rate)`
    *   `Session_Total_Mesos`: Suma del valor de todos los recursos usados que NO fueron cubiertos por el "pago de servicio".
    *   `Item_Cost_Mesos`: Si el ítem era stock propio (`in_stock`), se suma su costo de adquisición.
    *   `Meso_Rate`: Tasa de conversión USD/Meso definida al inicio de la sesión.

---

## 7. Apéndice: Fórmulas y Reglas Globales

### 7.1 Conversión de Moneda
El sistema utiliza una matriz de tipos de cambio centralizada en la tabla `exchange_rates`.
*   **Búsqueda Directa**: Busca `base_currency` -> `target_currency`.
*   **Búsqueda Inversa**: Si no existe la directa, busca `target` -> `base` y aplica `1 / tasa`.

### 7.2 Ciclo de Vida del Ítem (Status)
1.  **Bulk**: Ítem recién ingresado, sin procesar.
2.  **In Stock**: Ítem procesado (limpio o subido) listo para el taller o venta.
3.  **In Progress / Service**: Ítem actualmente en el Upgrade Workspace.
4.  **For Sale**: Ítem con precio de venta definido, visible en la lista de ventas.
5.  **Sold**: Ítem vendido, vinculado a una factura o pago.

---
**Fin de la Guía Funcional**

