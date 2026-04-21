-- ==========================================
-- TELSIM · ESQUEMA COMPLETO PARA RÉPLICA LOCAL (PG)
-- ==========================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Limpieza Inicial (Opcional, para asegurar entorno limpio)
DROP TABLE IF EXISTS public.notification_history CASCADE;
DROP TABLE IF EXISTS public.admin_settings CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.automation_logs CASCADE;
DROP TABLE IF EXISTS public.sms_logs CASCADE;
DROP TABLE IF EXISTS public.slots CASCADE;
DROP TABLE IF EXISTS public.external_user_mappings CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.api_clients CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.brand_keywords CASCADE;
DROP TABLE IF EXISTS public.contact_leads CASCADE;
DROP TABLE IF EXISTS public.device_sessions CASCADE;
DROP TABLE IF EXISTS public.interacciones CASCADE;
DROP TABLE IF EXISTS public.line_reactivation_tokens CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.subscription_invoices CASCADE;
DROP TABLE IF EXISTS public.subscriptions_archive CASCADE;
DROP TABLE IF EXISTS public.support_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.ticket_messages CASCADE;
DROP TABLE IF EXISTS public.user_feedback_status CASCADE;
DROP TABLE IF EXISTS public.user_ratings CASCADE;

-- 1. Clientes de API (Debe ir primero para ser referenciado por Users)
CREATE TABLE IF NOT EXISTS public.api_clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    secret_key_hash text NOT NULL,
    jwt_secret text,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now()
);

-- 2. Usuarios
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    nombre text,
    role text DEFAULT 'user',
    avatar_url text,
    telegram_enabled boolean DEFAULT false,
    telegram_token text,
    telegram_chat_id text,
    onboarding_completed boolean DEFAULT false,
    onboarding_step text,
    user_webhook_url text,
    webhook_is_active boolean DEFAULT false,
    api_secret_key text,
    origin_client_id uuid REFERENCES public.api_clients(id),
    pais text,
    moneda text DEFAULT 'USD',
    created_at timestamptz DEFAULT now()
);

-- 3. Mapeo de Usuarios Externos
CREATE TABLE IF NOT EXISTS public.external_user_mappings (
    api_client_id uuid REFERENCES public.api_clients(id),
    external_user_id text NOT NULL,
    telsim_user_id uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (api_client_id, external_user_id)
);

-- 4. Slots (Números de Teléfono)
CREATE TABLE IF NOT EXISTS public.slots (
    slot_id text PRIMARY KEY,
    phone_number text NOT NULL UNIQUE,
    plan_type text DEFAULT 'basic',
    status text DEFAULT 'libre',
    region text DEFAULT 'US',
    country text,
    label text,
    assigned_to uuid REFERENCES public.users(id),
    forwarding_active boolean DEFAULT false,
    forwarding_channel text,
    forwarding_config jsonb,
    created_at timestamptz DEFAULT now()
);

-- 5. Logs de SMS
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    slot_id text REFERENCES public.slots(slot_id),
    sender text,
    content text,
    verification_code text,
    service_name text,
    received_at timestamptz DEFAULT now(),
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 6. Logs de Automatización (Webhooks/Telegram)
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    slot_id text REFERENCES public.slots(slot_id),
    status text DEFAULT 'queued',
    payload jsonb,
    response text,
    response_body jsonb,
    sms_id uuid,
    provider text,
    created_at timestamptz DEFAULT now()
);

-- 7. Subscripciones e Historial
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    slot_id text REFERENCES public.slots(slot_id),
    phone_number text,
    plan_id text,
    plan_name text,
    amount numeric,
    monthly_limit integer,
    credits_used integer DEFAULT 0,
    status text,
    billing_type text,
    current_period_end timestamptz,
    trial_end timestamptz,
    next_billing_date timestamptz,
    activation_state text,
    stripe_subscription_id text,
    stripe_session_id text,
    created_at timestamptz DEFAULT now()
);

-- 8. Soporte y Feedback
CREATE TABLE IF NOT EXISTS public.user_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    rating integer,
    comment text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_feedback_status (
    user_id uuid PRIMARY KEY REFERENCES public.users(id),
    status text,
    updated_at timestamptz DEFAULT now()
);

-- 9. Configuración Admin e Historial de Notificaciones
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id text PRIMARY KEY,
    content text,
    label text,
    subject text,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    category text,
    title text,
    message text,
    type text,
    metadata jsonb,
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    subject text,
    status text DEFAULT 'open',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.support_tickets(id),
    sender_type text,
    content text,
    created_at timestamptz DEFAULT now()
);

-- 10. Tablas de Usuario Adicionales y Sesiones
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES public.users(id),
    updated_at timestamptz DEFAULT now(),
    username text,
    full_name text,
    avatar_url text,
    website text
);

CREATE TABLE IF NOT EXISTS public.device_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    device_info jsonb,
    last_active timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    stripe_payment_method_id text,
    brand text,
    last4 text,
    exp_month integer,
    exp_year integer,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    subscription_id uuid REFERENCES public.subscriptions(id),
    amount numeric,
    status text,
    invoice_url text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    action text,
    entity_type text,
    entity_id text,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz DEFAULT now()
);

-- 11. Tablas Restantes de Producción
CREATE TABLE IF NOT EXISTS public.brand_keywords (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword text UNIQUE,
    category text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text,
    source text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interacciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    tipo text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.line_reactivation_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id text REFERENCES public.slots(slot_id),
    token text UNIQUE,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    type text,
    content text,
    status text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions_archive (
    id uuid PRIMARY KEY,
    user_id uuid,
    slot_id text,
    plan_id text,
    archived_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.support_tickets(id),
    sender_id uuid,
    content text,
    created_at timestamptz DEFAULT now()
);

-- 12. Vistas Especiales
CREATE OR REPLACE VIEW public.slots_disponibles_para_venta AS
SELECT * FROM public.slots WHERE status = 'libre';

-- 13. Datos Iniciales (Seed)
INSERT INTO public.admin_settings (id, content, label, subject)
VALUES 
('welcome_email', '<p>Bienvenido a Telsim</p>', 'Email de Bienvenida', 'Bienvenido'),
('system_broadcast', 'Mantenimiento programado para mañana', 'Aviso del Sistema', 'Mantenimiento'),
('dashboard_banner', '{"show": true, "text": "¡Nueva funcionalidad de exportación disponible!"}', 'Banner Principal', 'Anuncio')
ON CONFLICT (id) DO NOTHING;

