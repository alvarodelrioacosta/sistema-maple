# **Especificación de Requerimientos del Sistema (SRS)**

## **Sistema de Gestión de Inventario, Recursos y Finanzas**

### **1\. Introducción**

**1.1 Propósito** Este documento describe de manera detallada los requerimientos funcionales y no funcionales para el desarrollo de una aplicación web privada destinada a la gestión de inventario, recursos y finanzas asociadas a cuentas de un juego. El objetivo es servir como guía única para el desarrollo mediante la plataforma de inteligencia artificial Antigravity.

**1.2 Alcance**

* Gestionar cuentas, personajes y objetos con estadísticas avanzadas.  
* Administrar inventarios de recursos (cubos y reward points).  
* Registrar procesos de mejora de objetos (“cubiadas”) con descuento automático de stock.  
* Gestionar compras de ítems, clientes recurrentes, ventas y métricas financieras.

---

### **2\. Modelo de Datos**

**2.1 Accounts (Cuentas)**

* **Campos:** Name, Email, Tag.  
* **Relaciones:** Una cuenta tiene muchos personajes y múltiples inventarios de recursos.

**2.2 Characters (Personajes)**

* **Campos:** Name, Level, Job, Account (Relación).  
* **Relaciones:** Muchos personajes pertenecen a una cuenta.

**2.3 Items (Objetos)**

* **Campos base:** Name, Star Force, Tradeability, Remaining Trade Slots, Estimated Value.  
* **Campos Dinámicos (Stats):** Main Potential Tier, Main Potential (1, 2, 3), Bonus Potential Tier, Bonus Potential (1, 2, 3).  
* **Cost (Nuevo):** Precio de adquisición o costo acumulado de mejora.  
* **Status (Actualizado):** Bulk, In Stock, For Sale, Sold.

**2.4 Resource Inventory (Inventario de Recursos)**

* **Campos:** Account, Resource Type (Bright Cubes / Bonus Bright Cubes / Reward Points), Quantity.  
* **Last Updated:** Fecha y hora de la última sincronización manual del stock.

**2.5 Exchange Rates (Tasas de Cambio \- NUEVA)**

* **Campos:** Base Currency, Target Currency, Rate, Last Update.

**2.6 Purchases (Registro de Compras \- NUEVA)**

* **Campos:** Item (Relación), Account (Destino), Purchase Cost, Currency, Date.

---

### **3\. Requerimientos Funcionales**

**3.1 Gestión de Compras y Stock (RF-10)**

* El sistema permitirá registrar la compra de ítems especificando el costo y la cuenta de destino.  
* **Lógica Financiera:** Cada compra genera automáticamente un "Egreso" en el módulo de Finanzas.

**3.2 Upgrade Workspace (RF-6 / RF-11)**

* **Selección:** Se elige un ítem, un cliente y la cuenta desde la cual se usarán los recursos.  
* **Edición en Tiempo Real:** Durante la sesión, el usuario podrá modificar el Tier y los 3 Stats (Main y Bonus) del ítem según el resultado del cubeo.  
* **Auto-Descuento:** Al guardar, el sistema resta automáticamente los cubos del Resource Inventory de la cuenta seleccionada.  
* **Capitalización:** Si el cliente es el "Administrador", el costo de los cubos usados se suma al campo Cost del ítem.

**3.3 Transferencia de Ítems (RF-3)**

* Permite transferir objetos entre personajes.  
* **Validación:** El selector de personajes destino debe estar filtrado por la cuenta donde se encuentra físicamente el objeto.

**3.4 Finanzas y Cuentas por Cobrar (RF-7 / RF-8)**

* Registro de ingresos, egresos y ventas a crédito.  
* **Cálculo de Utilidad:** $Utilidad \= Valor de Venta \- Costo acumulado$.  
* **Balance Neto:** Conversión de totales financieros a una moneda base usando la tabla de Exchange Rates.

---

### **4\. Reglas de Negocio (RN)**

1. El stock de cubos siempre se descuenta por cuenta automáticamente tras una sesión.  
2. Las cubiadas pueden usar recursos de múltiples cuentas para un mismo objeto.  
3. Si el cliente es el propio Administrador, no se genera una venta, sino un incremento en el costo del activo.  
4. Las cuentas por cobrar solo se activan si Is Credit Sale es marcado como "Yes".  
5. Un ítem "In Stock" o "Bulk" representa capital invertido; un ítem "Sold" representa capital recuperado.

---

### **5\. Requerimientos de Interfaz (UI)**

* **Dashboard:** KPIs de stock total (valor de costo), ingresos, egresos, cuentas por cobrar y balance neto multimoneda.  
* **Vistas principales:** Accounts, Characters, Items, Clients, Resources, Finance, Accounts Receivable y Upgrade Workspace .  
* **Panel de Cubeo:** Interfaz rápida para cambiar Tier y Stats del ítem mientras se descuentan recursos.

---

### **6\. Requerimientos No Funcionales**

* **Seguridad:** Acceso mediante autenticación obligatoria.  
* **Privacidad:** Aplicación de uso estrictamente privado.  
* **Persistencia:** Base de datos confiable gestionada por Antigravity.

