/* ============================================================================
   Portal Marques & Abreu — Cliente Supabase e helpers de autenticação
   ============================================================================
   Este ficheiro é partilhado por todas as páginas do portal.
   Requer que o script do supabase-js (CDN) seja incluído ANTES deste ficheiro:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
*/

const SUPABASE_URL = 'https://fwiyiiunnidqfdhsuwhz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aXlpaXVubmlkcWZkaHN1d2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQ0MzcsImV4cCI6MjA5Njg1MDQzN30.VQNc4j8uEmDHRnew9rIAQ2QHVboXrYy9pJr9sfc8W1E';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ----------------------------------------------------------------------
   requireAuth()
   - Verifica se existe sessão ativa.
   - Se não existir, redireciona para a página de login.
   - Se existir, devolve { session, profile } (profile = linha de public.profiles).
   ---------------------------------------------------------------------- */
async function requireAuth(opts){
  opts = opts || {};
  const allowPending = !!opts.allowPending;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if(!session){
    window.location.href = 'index.html';
    return null;
  }
  const profile = await getOwnProfile(session.user.id, session.user.email);

  if(profile.role === 'pendente' && !allowPending){
    window.location.href = 'pendente.html';
    return null;
  }
  if(profile.role !== 'pendente' && allowPending){
    window.location.href = 'home.html';
    return null;
  }
  return { session, profile };
}

/* ----------------------------------------------------------------------
   getOwnProfile(userId, email)
   - Obtém o perfil (role, nome) do utilizador autenticado.
   ---------------------------------------------------------------------- */
async function getOwnProfile(userId, email){
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if(error || !data){
    // Perfil ainda não criado (raro - trigger pode demorar um instante).
    // Por segurança, trata como pendente até o perfil existir.
    return { id: userId, full_name: email, email, role: 'pendente' };
  }
  return data;
}

/* ----------------------------------------------------------------------
   signOut()
   - Termina a sessão e volta ao ecrã de login.
   ---------------------------------------------------------------------- */
async function signOut(){
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

/* ----------------------------------------------------------------------
   renderTopbar(activePage, profile)
   - Preenche o cabeçalho comum (#topbar) com navegação e dados do utilizador.
   - activePage: 'home' | 'comercial' | 'rh' | 'utilizadores'
   ---------------------------------------------------------------------- */
function renderTopbar(activePage, profile){
  const el = document.getElementById('topbar');
  if(!el) return;

  const links = [
    { key:'home', href:'home.html', label:'Início' },
    { key:'comercial', href:'comercial.html', label:'Gestão Comercial' },
    { key:'rh', href:'rh.html', label:'Recursos Humanos' },
    { key:'clientes', href:'clientes.html', label:'Clientes' }
  ];
  if(profile && (profile.role === 'admin' || profile.role === 'editor')){
    links.push({ key:'utilizadores', href:'utilizadores.html', label:'Utilizadores e Permissões' });
  }

  const navHtml = links.map(l=>{
    const isActive = l.key === activePage;
    return `<a href="${l.href}" style="${isActive ? 'background:rgba(255,255,255,.28)' : ''}">${l.label}</a>`;
  }).join('') + `<button id="btn-logout" type="button">Sair</button>`;

  const roleLabels = { admin:'SuperAdmin', editor:'Gestor', viewer:'Comercial', diretor_comercial:'Diretor Comercial', pendente:'Pendente' };
  const name = (profile && (profile.full_name || profile.email)) || '';
  const roleLabel = (profile && roleLabels[profile.role]) || '';

  el.innerHTML = `
    <a href="home.html" class="brand"><span class="logo-dot"></span> Marques &amp; Abreu</a>
    <nav>${navHtml}</nav>
    <div class="user-info"><b>${escapeHtml(name)}</b>${escapeHtml(roleLabel)}</div>
  `;

  document.getElementById('btn-logout').addEventListener('click', signOut);
}

function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
