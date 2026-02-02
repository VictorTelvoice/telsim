export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  recommended?: boolean;
  trialDays?: number;
}

export interface NotificationDetails {
  number: string;
  plan: string;
  activationDate: string;
  nextBilling: string;
  price: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: string;
  type: 'activation' | 'message' | 'security' | 'subscription' | 'system';
  read: boolean;
  details?: NotificationDetails;
}

export interface SMSLog {
  id: string;
  user_id: string;
  sender: string;
  content: string;
  received_at: string;
  slot_id: string;
  service_name?: string;
  verification_code?: string;
  is_spam?: boolean;
  is_read: boolean;
}

export interface Slot {
  port_id: string;
  phone_number: string;
  plan_type: string;
  assigned_to: string;
  created_at: string;
  status?: string;
  region?: string;
  is_forwarding_active?: boolean;
  forwarding_channel?: 'telegram' | 'discord' | 'webhook';
  forwarding_config?: string;
}

export interface SimNumber {
  id: string;
  number: string;
  countryCode: string;
  countryName: string;
  gateway: string;
  planName: string;
  status: 'active' | 'trial' | 'expired';
  signal: '4G' | '5G' | 'LTE';
  unreadCount: number;
}