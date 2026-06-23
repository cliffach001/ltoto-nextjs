'use client';

interface SupabaseBannerProps {
  message: string;
  isConnected: boolean;
}

export default function SupabaseBanner({ message, isConnected }: SupabaseBannerProps) {
  if (!message) return null;

  return (
    <div
      id="supabaseStatusBanner"
      style={{
        margin: '0 0 18px',
        padding: '12px 16px',
        borderRadius: '14px',
        background: isConnected ? '#16a34a' : '#dc2626',
        color: '#ffffff',
        fontSize: '14px',
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {message}
    </div>
  );
}
