# Arquitectura de Integración: Telsim ↔ GoAuth

Este documento detalla el flujo de comunicación entre el proveedor de infraestructura (**Telsim**) y el consumidor de servicios (**GoAuth**).

## Diagrama de Secuencia

```mermaid
sequenceDiagram
    participant G as GoAuth (Orquestador)
    participant T as Telsim (Infraestructura)
    participant S as Red Telefónica (SIM)

    Note over G,T: 1. Aprovisionamiento (GoAuth -> Telsim)
    G->>T: POST /api/external/user/webhook
    Note right of G: Payload: Webhook URL + Secreto HMAC
    T->>T: Registra config en Usuario Sombra
    T-->>G: 200 OK (Listo para recibir)

    Note over S,G: 2. Notificación (Telsim -> GoAuth)
    S->>T: SMS Recibido (Hardware)
    T->>T: Trigger SQL: process_sms_forwarding()
    T->>G: POST /api/webhook/telsim
    Note right of T: Header: X-Telsim-Signature (HMAC)
    G->>G: Valida firma con Secreto Global
    G->>G: Busca Agente por número y guarda Log
    G-->>T: 200 OK (Mensaje procesado)
```

## Comparativa de Roles

| Característica | Telsim (Mundo 2) | GoAuth (Mundo 1) |
| :--- | :--- | :--- |
| **Rol Principal** | Proveedor de Infraestructura (SaaS) | Consumidor/Cerebro (AI Agents) |
| **Responsable de** | SIMs, SMS, Database Triggers | Lógica de Negocio, Dashboard, UI |
| **Seguridad Saliente** | Firma HMAC (X-Telsim-Signature) | Bearer JWT (TELSIM_API_TOKEN) |
| **Seguridad Entrante** | Bearer JWT | Firma HMAC (X-Telsim-Signature) |

## Configuración de Seguridad
Para esta integración se utiliza un **Secreto Global** configurado en ambas plataformas:

- **En GoAuth (.env):** `TELSIM_WEBHOOK_SECRET`
- **En Telsim (Shadow User):** `api_secret_key`

> [!TIP]
> Al usar firmas HMAC, GoAuth puede estar 100% seguro de que los mensajes que recibe en su webhook son auténticos y provienen de Telsim, sin necesidad de consultar la API constantemente (Pull) sino recibiendo los datos en tiempo real (Push).
