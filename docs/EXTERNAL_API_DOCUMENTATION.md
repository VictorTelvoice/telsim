# Telsim · External API Documentation (v1.0)

Esta documentación describe cómo integrar y consumir los servicios de asignación de números de Telsim de forma programática.

## 1. Autenticación

Todas las peticiones a la API externa deben incluir un token JWT en el header de autorización.

* **Header**: `Authorization`
* **Formato**: `Bearer <TU_JWT_TOKEN>`

> [!IMPORTANT]
> El token JWT es personal e intransferible. Si sospechas que tu token ha sido comprometido, contacta al soporte de Telsim para revocarlo y generar uno nuevo.

---

## 2. Endpoints Disponibles

La URL base para todas las peticiones es: `https://telsim.io/api/external`
*(O tu dominio configurado en Vercel)*

### 2.1 Listar Números Asignados
Obtén la lista de todos los números de teléfono actualmente asignados a tu cuenta.

* **Metodo**: `GET`
* **Ruta**: `/numbers`
* **Parámetros Query (Opcional)**:
    * `id`: ID del slot específico para obtener solo sus detalles.
    
**Respuesta Exitosa (200 OK)**:
```json
{
  "data": [
    {
      "slot_id": "EXT-ABC123",
      "phone_number": "+1234567890",
      "plan_type": "premium",
      "status": "ocupado",
      "created_at": "2024-04-13T10:00:00Z",
      "region": "US",
      "label": "GoAuth Integration"
    }
  ]
}
```

---

### 2.2 Asignar Nuevo Número
Busca un número libre en el inventario global de Telsim y lo asigna a tu cuenta, registrando automáticamente la trazabilidad del usuario final.

* **Metodo**: `POST`
* **Ruta**: `/numbers`
* **Cuerpo (JSON)**:
    * `user_id`: (Obligatorio - String) ID único del usuario en la plataforma externa (ej: GoAuth).
    * `user_name`: (Opcional - String) Nombre del usuario para mostrar en Telsim.
    * `user_email`: (Opcional - String) Email del usuario.
    * `region`: (Opcional - String) Código de región (Ej: "US"). Por defecto "US".
    * `plan_type`: (Opcional - String) Tipo de plan (Ej: "basic", "premium"). Por defecto "basic".
    * `label`: (Opcional - String) Etiqueta personalizada. Si no se envía, se usará el nombre del usuario.

> [!NOTE]
> **Trazabilidad (Shadow Users)**: Telsim creará un registro interno vinculado a tu `api_client_id` para este `user_id`. Esto permite ver qué usuario tiene qué número directamente desde el dashboard de Telsim.

**Respuesta Exitosa (201 Created)**:
```json
{
  "message": "Number successfully assigned",
  "data": {
    "slot_id": "EXT-XYZ789",
    "phone_number": "+10987654321",
    "status": "ocupado"
  }
}
```

**Errores Posibles**:
* `422 Unprocessable Entity`: No hay números disponibles en el inventario para los criterios seleccionados.
* `400 Bad Request`: Faltan parámetros obligatorios.

---

### 2.3 Liberar Número
Libera un número asignado y lo devuelve al inventario global de Telsim.

* **Metodo**: `DELETE`
* **Ruta**: `/numbers?id={slot_id}`

**Respuesta Exitosa (200 OK)**:
```json
{
  "message": "Number successfully released."
}
```

**Errores Posibles**:
* `404 Not Found`: El número no existe o no pertenece a tu cuenta.

---

## 3. Ejemplos de Implementación (cURL)

### Listar mis números
```bash
curl -X GET "https://telsim.io/api/external/numbers" \
     -H "Authorization: Bearer TU_JWT_TOKEN"
```

### Asignar un nuevo número
```bash
curl -X POST "https://telsim.io/api/external/numbers" \
     -H "Authorization: Bearer TU_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "user_12345",
       "user_name": "Juan Perez",
       "user_email": "juan@example.com",
       "region": "US",
       "plan_type": "premium",
       "label": "Agente Validador"
     }'
```

### Liberar un número
```bash
curl -X DELETE "https://telsim.io/api/external/numbers?id=EXT-XYZ789" \
     -H "Authorization: Bearer TU_JWT_TOKEN"
```
