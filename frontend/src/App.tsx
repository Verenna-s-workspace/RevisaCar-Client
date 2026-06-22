import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';

/* ─── Lazy screens ──────────────────────────────────────── */
const Auth            = lazy(() => import('./components/screens/AuthScreen').then(m => ({ default: m.AuthScreen })));
const Dashboard       = lazy(() => import('./components/screens/DashboardScreen').then(m => ({ default: m.DashboardScreen })));
const Vehicles        = lazy(() => import('./components/screens/VehiclesScreen').then(m => ({ default: m.VehiclesScreen })));
const VehicleDetail   = lazy(() => import('./components/screens/VehicleDetailScreen').then(m => ({ default: m.VehicleDetailScreen })));
const AddVehicle      = lazy(() => import('./components/screens/AddVehicleScreen').then(m => ({ default: m.AddVehicleScreen })));
const EditVehicle     = lazy(() => import('./components/screens/EditVehicleScreen').then(m => ({ default: m.EditVehicleScreen })));
const VehicleHealth   = lazy(() => import('./components/screens/VehicleHealthScreen').then(m => ({ default: m.VehicleHealthScreen })));
const Schedule        = lazy(() => import('./components/screens/ScheduleScreen').then(m => ({ default: m.ScheduleScreen })));
const History         = lazy(() => import('./components/screens/HistoryScreen').then(m => ({ default: m.HistoryScreen })));
const Maintenance     = lazy(() => import('./components/screens/ScheduledMaintenanceScreen').then(m => ({ default: m.ScheduledMaintenanceScreen })));
const Estimates       = lazy(() => import('./components/screens/EstimatesScreen').then(m => ({ default: m.EstimatesScreen })));
const Notifications   = lazy(() => import('./components/screens/NotificationsScreen').then(m => ({ default: m.NotificationsScreen })));
const Profile         = lazy(() => import('./components/screens/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const QRCode          = lazy(() => import('./components/screens/QRCodeScreen').then(m => ({ default: m.QRCodeScreen })));
const Documents       = lazy(() => import('./components/screens/DocumentsScreen').then(m => ({ default: m.DocumentsScreen })));
const ServiceTracking = lazy(() => import('./components/screens/ServiceTrackingScreen').then(m => ({ default: m.ServiceTrackingScreen })));
const CostAnalysis    = lazy(() => import('./components/screens/CostAnalysisScreen').then(m => ({ default: m.CostAnalysisScreen })));
const Rewards         = lazy(() => import('./components/screens/RewardsScreen').then(m => ({ default: m.RewardsScreen })));
const Chat            = lazy(() => import('./components/screens/ChatScreen').then(m => ({ default: m.ChatScreen })));
const NotifDetail     = lazy(() => import('./components/screens/NotificationDetailScreen').then(m => ({ default: m.NotificationDetailScreen })));
const SettingsScr     = lazy(() => import('./components/screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const NotifPrefs      = lazy(() => import('./components/screens/NotificationPreferencesScreen').then(m => ({ default: m.NotificationPreferencesScreen })));
const PaymentMethods  = lazy(() => import('./components/screens/PaymentMethodsScreen').then(m => ({ default: m.PaymentMethodsScreen })));
const Security        = lazy(() => import('./components/screens/SecurityScreen').then(m => ({ default: m.SecurityScreen })));
const Privacy         = lazy(() => import('./components/screens/PrivacyScreen').then(m => ({ default: m.PrivacyScreen })));
const HelpCenter      = lazy(() => import('./components/screens/HelpCenterScreen').then(m => ({ default: m.HelpCenterScreen })));
const Legal           = lazy(() => import('./components/screens/LegalScreen').then(m => ({ default: m.LegalScreen })));
const DeleteAccount   = lazy(() => import('./components/screens/DeleteAccountScreen').then(m => ({ default: m.DeleteAccountScreen })));
const ServiceDetail   = lazy(() => import('./components/screens/ServiceDetailScreen').then(m => ({ default: m.ServiceDetailScreen })));
const InspectionReport = lazy(() => import('./components/screens/InspectionReportScreen').then(m => ({ default: m.InspectionReportScreen })));
const Warranty        = lazy(() => import('./components/screens/WarrantyScreen').then(m => ({ default: m.WarrantyScreen })));

/* ─── Query Client ──────────────────────────────────────── */
const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

/* ─── Guards ────────────────────────────────────────────── */
const shouldBypassAuth = import.meta.env.MODE !== 'production' || import.meta.env.VITE_BYPASS_LOGIN === 'true';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!shouldBypassAuth && !isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/* ─── Loader ────────────────────────────────────────────── */
function AppLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F6F3' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-[18px] flex items-center justify-center"
             style={{ background: '#E5071A' }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
               stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="12" rx="2"/>
            <path d="M16 8h4l3 3v4h-7V8z"/>
            <circle cx="5.5" cy="17.5" r="2.5"/>
            <circle cx="18.5" cy="17.5" r="2.5"/>
          </svg>
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                 style={{ background: '#E5071A', animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Router ────────────────────────────────────────────── */
function AppRouter() {
  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        {/* Auth */}
        <Route path="/login"    element={shouldBypassAuth ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/cadastro" element={shouldBypassAuth ? <Navigate to="/" replace /> : <Auth />} />

        {/* Core nav (4 items) */}
        <Route path="/"             element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/veiculo"      element={<RequireAuth><Vehicles /></RequireAuth>} />
        <Route path="/historico"    element={<RequireAuth><History /></RequireAuth>} />
        <Route path="/perfil"       element={<RequireAuth><Profile /></RequireAuth>} />

        {/* Vehicle */}
        <Route path="/veiculo/:id"        element={<RequireAuth><VehicleDetail /></RequireAuth>} />
        <Route path="/veiculo/:id/editar" element={<RequireAuth><EditVehicle /></RequireAuth>} />
        <Route path="/veiculos/novo"      element={<RequireAuth><AddVehicle /></RequireAuth>} />
        <Route path="/veiculos"           element={<Navigate to="/veiculo" replace />} />
        <Route path="/saude"              element={<RequireAuth><VehicleHealth /></RequireAuth>} />

        {/* Services */}
        <Route path="/agendar"      element={<RequireAuth><Schedule /></RequireAuth>} />
        <Route path="/manutencoes"  element={<RequireAuth><Maintenance /></RequireAuth>} />
        <Route path="/orcamentos"   element={<RequireAuth><Estimates /></RequireAuth>} />
        <Route path="/acompanhar"   element={<RequireAuth><ServiceTracking /></RequireAuth>} />
        <Route path="/servico/:id"          element={<RequireAuth><ServiceDetail /></RequireAuth>} />
        <Route path="/servico/:id/inspecao" element={<RequireAuth><InspectionReport /></RequireAuth>} />
        <Route path="/garantia/:id"         element={<RequireAuth><Warranty /></RequireAuth>} />

        {/* Features */}
        <Route path="/notificacoes"     element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="/notificacoes/:id" element={<RequireAuth><NotifDetail /></RequireAuth>} />
        <Route path="/qr-code"      element={<RequireAuth><QRCode /></RequireAuth>} />
        <Route path="/qr"           element={<RequireAuth><QRCode /></RequireAuth>} />
        <Route path="/documentos"   element={<RequireAuth><Documents /></RequireAuth>} />
        <Route path="/gastos"       element={<RequireAuth><CostAnalysis /></RequireAuth>} />
        <Route path="/clube"        element={<RequireAuth><Rewards /></RequireAuth>} />
        <Route path="/chat"         element={<RequireAuth><Chat /></RequireAuth>} />

        {/* Conta & perfil */}
        <Route path="/ajustes"      element={<RequireAuth><SettingsScr /></RequireAuth>} />
        <Route path="/preferencias" element={<RequireAuth><NotifPrefs /></RequireAuth>} />
        <Route path="/pagamento"    element={<RequireAuth><PaymentMethods /></RequireAuth>} />
        <Route path="/seguranca"    element={<RequireAuth><Security /></RequireAuth>} />
        <Route path="/privacidade"  element={<RequireAuth><Privacy /></RequireAuth>} />
        <Route path="/ajuda"        element={<RequireAuth><HelpCenter /></RequireAuth>} />
        <Route path="/termos"       element={<RequireAuth><Legal /></RequireAuth>} />
        <Route path="/politica"     element={<RequireAuth><Legal /></RequireAuth>} />
        <Route path="/excluir-conta" element={<RequireAuth><DeleteAccount /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

/* ─── App ───────────────────────────────────────────────── */
export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppRouter />
        <Toaster
          position="top-center"
          gutter={8}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#14161A',
              color: '#FFFFFF',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '0.875rem',
              fontWeight: '600',
              borderRadius: '14px',
              padding: '12px 18px',
              maxWidth: '380px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            },
            success: { iconTheme: { primary: '#18B26B', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#E5071A', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
