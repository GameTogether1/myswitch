// ===== Supabase 配置 =====
const SUPABASE_URL = 'https://szeedpcuharbupkjrnob.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6ZWVkcGN1aGFyYnVwa2pybm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTY3MDAsImV4cCI6MjA4ODEzMjcwMH0.7Qhchq8-NJG_Yqpx40r2idwt9iN98Hg63cHWIZ8lMTY';
let supabaseClient;
try {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase 初始化成功');
} catch(e) {
  console.error('❌ Supabase 初始化失败:', e);
}
// ===== 全局状态 =====
let currentFilter = 'all';
let currentSearch = '';
let currentPage = 1;
const gamesPerPage = 16;
let lastClickedCard = null;
let currentUser = null;
let currentUserProfile = null;
// ===== DOM =====
const gamesGrid = document.getElementById('gamesGrid');
const tagsContainer = document.getElementById('tagsContainer');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const totalCount = document.getElementById('totalCount');
const emptyState = document.getElementById('emptyState');
const pagination = document.getElementById('pagination');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const authOverlay = document.getElementById('authOverlay');
const forgotOverlay = document.getElementById('forgotOverlay');
const changePwdOverlay = document.getElementById('changePwdOverlay');
const memberOverlay = document.getElementById('memberOverlay');
const vipOverlay = document.getElementById('vipOverlay');
const orderOverlay = document.getElementById('orderOverlay');
// ===== 粒子 =====
const particleCanvas = document.getElementById('particleCanvas');
const ctx = particleCanvas.getContext('2d');
let particles = [];
let animId;
let mouseX = -1000, mouseY = -1000;
function resizeParticles() { particleCanvas.width = innerWidth; particleCanvas.height = innerHeight; }
class Particle {
  constructor() { this.reset(true); }
  reset(init) {
    this.x = init ? Math.random()*particleCanvas.width : mouseX;
    this.y = init ? Math.random()*particleCanvas.height : mouseY;
    this.vx = (Math.random()-0.5)*0.5; this.vy = (Math.random()-0.5)*0.5;
    this.size = Math.random()*2.5+0.8; this.opacity = Math.random()*0.35+0.1;
    this.color = Math.random()<0.5 ? '230,0,64' : '0,170,255';
  }
  update() {
    this.x+=this.vx; this.y+=this.vy;
    const dx=this.x-mouseX, dy=this.y-mouseY, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<180){ const f=(180-dist)/180; this.x+=dx/dist*f*2; this.y+=dy/dist*f*2; this.opacity=Math.min(0.6,this.opacity+f*0.02); }
    if(this.x<-10)this.x=particleCanvas.width+10; if(this.x>particleCanvas.width+10)this.x=-10;
    if(this.y<-10)this.y=particleCanvas.height+10; if(this.y>particleCanvas.height+10)this.y=-10;
    if(this.opacity>0.15)this.opacity-=0.0005;
  }
  draw(){ ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fillStyle=`rgba(${this.color},${this.opacity})`; ctx.fill(); }
}
function initParticles(){ const c=Math.floor(particleCanvas.width*particleCanvas.height/15000); particles=Array.from({length:Math.min(c,150)},()=>new Particle()); }
function animateParticles(){ ctx.clearRect(0,0,particleCanvas.width,particleCanvas.height); particles.forEach(p=>{p.update();p.draw();}); animId=requestAnimationFrame(animateParticles); }
// ===== Toast 弹窗 =====
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.warn('Toast容器不存在:', msg);
    return;
  }
  
  // 移除旧的同类型toast（避免堆积）
  const existingToasts = container.querySelectorAll('.toast');
  if (existingToasts.length > 5) {
    existingToasts[0].remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  
  // 触发进入动画
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // 自动移除
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 300);
  }, 3000);
}
// ===== 抖动动画（让表单震动提示） =====
function shakeForm(formElement) {
  if (!formElement) return;
  formElement.style.animation = 'none';
  // 强制重排
  void formElement.offsetHeight;
  formElement.style.animation = 'shake 0.5s ease';
  setTimeout(() => {
    formElement.style.animation = '';
  }, 600);
}
// ===== 弹窗控制 =====
function openAuth() { authOverlay.classList.add('active'); }
function closeAuth() { authOverlay.classList.remove('active'); }
function openForgot() { closeAuth(); forgotOverlay.classList.add('active'); }
function closeForgot() { forgotOverlay.classList.remove('active'); }
function openChangePwd() { changePwdOverlay.classList.add('active'); }
function closeChangePwd() { changePwdOverlay.classList.remove('active'); }
function openMemberModal() { memberOverlay.classList.add('active'); }
function closeMemberModal() { memberOverlay.classList.remove('active'); }
function openVIPModal() { closeMemberModal(); vipOverlay.classList.add('active'); }
function closeVIPModal() { vipOverlay.classList.remove('active'); }
function openOrderModal() { closeVIPModal(); orderOverlay.classList.add('active'); document.getElementById('orderNumber').value=''; updateOrderDots(); }
function closeOrderModal() { orderOverlay.classList.remove('active'); }
function switchToRegisterView() {
  document.getElementById('tabLogin').classList.remove('active');
  document.getElementById('tabRegister').classList.add('active');
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'flex';
  document.getElementById('loginForm').reset();
  document.querySelectorAll('.auth-input').forEach(el => el.classList.remove('error', 'success'));
}
function switchToLoginView() {
  document.getElementById('tabRegister').classList.remove('active');
  document.getElementById('tabLogin').classList.add('active');
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'flex';
  document.getElementById('registerForm').reset();
  document.querySelectorAll('.auth-input').forEach(el => el.classList.remove('error', 'success'));
  document.getElementById('passwordStrength').style.display = 'none';
}
// ===== 工具函数 =====
function isValidEmail(email) {
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
}
function isStrongPassword(password) {
  return /[a-zA-Z]/.test(password) && /\d/.test(password) && password.length >= 6;
}
function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}
function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
// ===== 密码强度指示器 =====
function setupPasswordStrength(inputId, indicatorId, strengthId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(indicatorId);
  const indicator = document.getElementById(strengthId);
  if (!input || !container || !indicator) return;
  input.addEventListener('input', function() {
    const val = this.value;
    if (!val) { container.style.display = 'none'; return; }
    
    container.style.display = 'block';
    const strength = getPasswordStrength(val);
    
    if (strength <= 1) {
      indicator.textContent = '弱 (建议包含字母和数字)';
      indicator.style.color = '#ef4444';
    } else if (strength <= 3) {
      indicator.textContent = '中';
      indicator.style.color = '#f59e0b';
    } else {
      indicator.textContent = '强 ✓';
      indicator.style.color = '#22c55e';
    }
  });
}
// ===== 非会员下载限制检查 =====
function checkDownloadAccess(gameId) {
  if(!currentUser){ 
    showToast('⚠️ 请先登录后再下载', 'warning'); 
    openAuth(); 
    return false; 
  }
  if(currentUserProfile?.is_member) return true;
  const today = getTodayDateStr();
  const storageKey = `download_limit_${currentUser.id}`;
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{"date":"","gameId":null}');
  if(saved.date !== today) {
    saved.date = today;
    saved.gameId = null;
    localStorage.setItem(storageKey, JSON.stringify(saved));
  }
  if(saved.gameId === null) {
    saved.gameId = gameId;
    localStorage.setItem(storageKey, JSON.stringify(saved));
    return true;
  }
  if(saved.gameId === gameId) {
    return true;
  }
  openMemberModal();
  return false;
}
// ===== 认证 =====
async function checkAuthStatus() {
  if (!supabaseClient) { 
    currentUser = null; 
    currentUserProfile = null; 
    updateAuthUI(); 
    return; 
  }
  
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) { throw error; }
    if (!session) { currentUser = null; currentUserProfile = null; updateAuthUI(); return; }
    currentUser = session.user;
    await fetchUserProfile();
    updateAuthUI();
  } catch(err) {
    console.error('Auth check error:', err);
    currentUser = null;
    currentUserProfile = null;
    updateAuthUI();
  }
}
async function fetchUserProfile() {
  if (!currentUser || !supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from('GameTogether').select('*').eq('id', currentUser.id).single();
    if (!error && data) currentUserProfile = data;
    else currentUserProfile = { is_member: false };
  } catch(e) { currentUserProfile = { is_member: false }; }
}
// ============================================================
// ===== 登录（完整错误处理 + Toast 提示） =====
// ============================================================
async function handleLogin(e) {
  e.preventDefault();
  
  const form = e.target;
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  
  // ===== 前端验证（每个错误都有 Toast 提示） =====
  if (!email) {
    showToast('❌ 请输入电子邮箱', 'error');
    shakeForm(form);
    return;
  }
  if (!password) {
    showToast('❌ 请输入密码', 'error');
    shakeForm(form);
    return;
  }
  if (!isValidEmail(email)) {
    showToast('❌ 请输入有效的邮箱地址（如 user@example.com）', 'error');
    shakeForm(form);
    return;
  }
  
  if (!supabaseClient) {
    showToast('❌ 系统离线，请稍后再试', 'error');
    return;
  }
  
  const submitBtn = document.getElementById('loginSubmit');
  const origText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '登录中...';
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ 
      email: email, 
      password: password 
    });
    
    if (error) {
      // ===== 详细的错误分类（每个都有 Toast 提示） =====
      const errorMsg = error.message;
      console.log('登录错误:', errorMsg);
      
      if (errorMsg.includes('Invalid login credentials')) {
        showToast('❌ 邮箱或密码错误，请重新输入', 'error');
      } else if (errorMsg.includes('Email not confirmed')) {
        showToast('⚠️ 请先验证您的邮箱，查收验证邮件', 'warning');
      } else if (errorMsg.includes('Too many requests')) {
        showToast('⚠️ 请求过于频繁，请稍后再试', 'warning');
      } else if (errorMsg.includes('Invalid email')) {
        showToast('❌ 邮箱格式不正确，请输入有效的邮箱地址', 'error');
      } else if (errorMsg.includes('not found')) {
        showToast('❌ 该邮箱未注册，请先注册', 'error');
      } else {
        showToast('❌ 登录失败：' + errorMsg, 'error');
      }
      shakeForm(form);
      return;
    }
    
    // ===== 登录成功 =====
    currentUser = data.user;
    await fetchUserProfile();
    updateAuthUI();
    closeAuth();
    document.getElementById('loginForm').reset();
    showToast('🎉 登录成功！欢迎回来', 'success');
    
  } catch(err) {
    console.error('登录异常:', err);
    showToast('❌ 网络异常，请检查连接后重试', 'error');
    shakeForm(form);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = origText;
  }
}
// ============================================================
// ===== 注册（完整错误处理 + Toast 提示） =====
// ============================================================
async function handleRegister(e) {
  e.preventDefault();
  
  const form = e.target;
  const email = document.getElementById('registerEmail').value.trim().toLowerCase();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;
  
  // ===== 前端验证（每个错误都有 Toast 提示） =====
  if (!email) {
    showToast('❌ 请输入电子邮箱', 'error');
    shakeForm(form);
    return;
  }
  if (!isValidEmail(email)) {
    showToast('❌ 请输入有效的邮箱地址（如 user@example.com）', 'error');
    shakeForm(form);
    return;
  }
  if (!password) {
    showToast('❌ 请设置密码', 'error');
    shakeForm(form);
    return;
  }
  if (password.length < 6) {
    showToast('❌ 密码至少需要 6 个字符', 'error');
    shakeForm(form);
    return;
  }
  if (password.length > 72) {
    showToast('❌ 密码不能超过 72 个字符', 'error');
    shakeForm(form);
    return;
  }
  if (!isStrongPassword(password)) {
    showToast('⚠️ 密码需包含字母和数字，至少6位', 'warning');
    shakeForm(form);
    return;
  }
  if (password !== confirm) {
    showToast('❌ 两次输入的密码不一致', 'error');
    shakeForm(form);
    return;
  }
  
  if (!supabaseClient) {
    showToast('❌ 系统离线，请稍后再试', 'error');
    return;
  }
  
  const submitBtn = document.getElementById('registerSubmit');
  const origText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '注册中...';
  
  try {
    const { data, error } = await supabaseClient.auth.signUp({ 
      email: email, 
      password: password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    
    if (error) {
      // ===== 详细的错误分类（每个都有 Toast 提示） =====
      const errorMsg = error.message;
      console.log('注册错误:', errorMsg);
      
      if (errorMsg.includes('already registered')) {
        showToast('⚠️ 该邮箱已被注册，请直接登录', 'warning');
        switchToLoginView();
      } else if (errorMsg.includes('Password should be at least')) {
        showToast('❌ 密码至少需要 6 个字符', 'error');
      } else if (errorMsg.includes('Invalid email')) {
        showToast('❌ 邮箱格式不正确，请输入有效的邮箱地址', 'error');
      } else if (errorMsg.includes('rate limit')) {
        showToast('⚠️ 操作过于频繁，请稍后再试', 'warning');
      } else if (errorMsg.includes('email')) {
        showToast('❌ 请输入有效的邮箱地址', 'error');
      } else {
        showToast('❌ 注册失败：' + errorMsg, 'error');
      }
      shakeForm(form);
      return;
    }
    
    // ===== 检查是否已有账号 =====
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      showToast('⚠️ 该邮箱已被注册，请直接登录', 'warning');
      switchToLoginView();
      return;
    }
    
    // ===== 注册成功 =====
    if (data.user && data.user.confirmed_at === null) {
      showToast('📧 验证邮件已发送，请查收邮箱完成验证', 'success');
    } else {
      showToast('🎉 注册成功！请登录', 'success');
    }
    
    document.getElementById('registerForm').reset();
    document.getElementById('registerConfirm').value = '';
    document.getElementById('passwordStrength').style.display = 'none';
    switchToLoginView();
    
  } catch(err) {
    console.error('注册异常:', err);
    showToast('❌ 网络异常，请检查连接后重试', 'error');
    shakeForm(form);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = origText;
  }
}
// ============================================================
// ===== 忘记密码（完整错误处理 + Toast 提示） =====
// ============================================================
async function handleForgotPassword(e) {
  e.preventDefault();
  
  const form = e.target;
  const email = document.getElementById('forgotEmail').value.trim();
  
  if (!email) {
    showToast('❌ 请输入您的邮箱地址', 'error');
    shakeForm(form);
    return;
  }
  if (!isValidEmail(email)) {
    showToast('❌ 请输入有效的邮箱地址', 'error');
    shakeForm(form);
    return;
  }
  if (!supabaseClient) {
    showToast('❌ 系统离线，请稍后再试', 'error');
    return;
  }
  
  const submitBtn = document.getElementById('forgotSubmit');
  const origText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '发送中...';
  
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });
    
    if (error) {
      const errorMsg = error.message;
      console.log('忘记密码错误:', errorMsg);
      
      if (errorMsg.includes('not found')) {
        showToast('⚠️ 该邮箱未注册，请先注册', 'warning');
      } else if (errorMsg.includes('rate limit')) {
        showToast('⚠️ 操作过于频繁，请稍后再试', 'warning');
      } else if (errorMsg.includes('Invalid email')) {
        showToast('❌ 邮箱格式不正确，请输入有效的邮箱地址', 'error');
      } else {
        showToast('❌ 发送失败：' + errorMsg, 'error');
      }
      shakeForm(form);
      return;
    }
    
    showToast('📧 重置邮件已发送，请查收邮箱', 'success');
    document.getElementById('forgotForm').reset();
    closeForgot();
  } catch(err) {
    console.error('忘记密码异常:', err);
    showToast('❌ 网络异常，请稍后再试', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = origText;
  }
}
// ============================================================
// ===== 修改密码（完整错误处理 + Toast 提示） =====
// ============================================================
async function handleChangePassword(e) {
  e.preventDefault();
  
  const form = e.target;
  const newPwd = document.getElementById('newPassword').value;
  const confirmPwd = document.getElementById('confirmNewPassword').value;
  
  if (!newPwd) {
    showToast('❌ 请设置新密码', 'error');
    shakeForm(form);
    return;
  }
  if (newPwd.length < 6) {
    showToast('❌ 密码至少需要 6 个字符', 'error');
    shakeForm(form);
    return;
  }
  if (!isStrongPassword(newPwd)) {
    showToast('⚠️ 密码需包含字母和数字，至少6位', 'warning');
    shakeForm(form);
    return;
  }
  if (newPwd !== confirmPwd) {
    showToast('❌ 两次输入的密码不一致', 'error');
    shakeForm(form);
    return;
  }
  
  if (!supabaseClient) {
    showToast('❌ 系统离线，请稍后再试', 'error');
    return;
  }
  
  const submitBtn = document.getElementById('changePwdSubmit');
  const origText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '修改中...';
  
  try {
    const { error } = await supabaseClient.auth.updateUser({ password: newPwd });
    
    if (error) {
      const errorMsg = error.message;
      console.log('修改密码错误:', errorMsg);
      
      if (errorMsg.includes('same as the old password')) {
        showToast('⚠️ 新密码不能与旧密码相同', 'warning');
      } else if (errorMsg.includes('Password should be at least')) {
        showToast('❌ 密码至少需要 6 个字符', 'error');
      } else {
        showToast('❌ 修改失败：' + errorMsg, 'error');
      }
      shakeForm(form);
      return;
    }
    
    showToast('✅ 密码修改成功', 'success');
    closeChangePwd();
    document.getElementById('changePwdForm').reset();
    document.getElementById('changePwdStrength').style.display = 'none';
  } catch(err) {
    console.error('修改密码异常:', err);
    showToast('❌ 网络异常，请稍后再试', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = origText;
  }
}
// ===== 登出 =====
async function handleLogout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null; 
  currentUserProfile = null;
  updateAuthUI();
  showToast('👋 已退出登录', 'info');
}
// ===== 订单 =====
function updateOrderDots() {
  const input = document.getElementById('orderNumber');
  const len = input.value.length;
  document.getElementById('orderLen').textContent = `${len}/32`;
  const dots = document.querySelectorAll('.order-dot');
  dots.forEach((dot, idx) => {
    if (idx < len) dot.classList.add('filled');
    else dot.classList.remove('filled');
  });
  document.getElementById('submitOrder').disabled = len !== 32;
}
async function submitOrder() {
  const orderNo = document.getElementById('orderNumber').value;
  if(orderNo.length !== 32){ 
    showToast('❌ 订单号必须是32位', 'error'); 
    return; 
  }
  if(!supabaseClient || !currentUser){ 
    showToast('❌ 系统错误', 'error'); 
    return; 
  }
  try {
    const { error } = await supabaseClient.from('GameTogether').update({ 
      is_member: true, 
      order_id: orderNo 
    }).eq('id', currentUser.id);
    if (error) throw error;
    currentUserProfile.is_member = true;
    showToast('🎉 会员开通成功！', 'success');
    closeOrderModal();
    updateAuthUI();
  } catch(e) { 
    showToast('❌ 验证失败: ' + e.message, 'error'); 
  }
}
// ===== UI =====
function updateAuthUI() {
  const section = document.getElementById('auth-section');
  if (currentUser) {
    const email = currentUser.email;
    const name = email.split('@')[0];
    const isMember = currentUserProfile?.is_member;
    section.innerHTML = `
      <div class="user-menu">
        <span class="user-name">${name}</span>
        <div class="user-avatar">${name.charAt(0).toUpperCase()}</div>
        ${isMember ? '<span class="user-crown">👑</span>' : ''}
        <div class="user-dropdown">
          <button id="changePwdBtn"><span>🔑</span> 修改密码</button>
          ${!isMember ? '<button id="vipOpenBtn"><span>👑</span> 开通会员</button>' : ''}
          <div class="dropdown-divider"></div>
          <button id="logoutBtn" class="logout-btn"><span>🚪</span> 退出登录</button>
        </div>
      </div>
    `;
    document.getElementById('changePwdBtn').addEventListener('click', openChangePwd);
    if(!isMember) document.getElementById('vipOpenBtn').addEventListener('click', openVIPModal);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  } else {
    section.innerHTML = `<button id="login-btn" class="nav-login-btn">登录</button>`;
    document.getElementById('login-btn').addEventListener('click', openAuth);
  }
}
// ===== 渲染 =====
function renderTags() {
  tagsContainer.innerHTML = gameTypes.map(type => `
    <div class="tag ${type.id==='all'?'active':''}" data-type="${type.id}">${type.label}</div>
  `).join('');
}
function getFilteredGames() {
  let filtered = [...gamesData];
  if(currentFilter!=='all') filtered = filtered.filter(g=>g.type===currentFilter);
  if(currentSearch.trim()){
    const s = currentSearch.toLowerCase();
    filtered = filtered.filter(g=>g.name.toLowerCase().includes(s)||g.nameEn.toLowerCase().includes(s));
  }
  return filtered;
}
function renderPage() {
  const filtered = getFilteredGames();
  const totalPages = Math.ceil(filtered.length / gamesPerPage);
  if(currentPage > totalPages) currentPage = Math.max(1, totalPages);
  const start = (currentPage - 1) * gamesPerPage;
  // 关键改动：拷贝数组再反转，不修改源数据
  const pageGames = [...filtered].reverse().slice(start, start + gamesPerPage);
  
  totalCount.textContent = `共 ${filtered.length} 款`;
  if(pageGames.length === 0) {
    gamesGrid.innerHTML = '';
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    gamesGrid.innerHTML = pageGames.map((game, i) => `
      <div class="game-card" data-id="${game.id}" style="animation-delay:${i*0.03}s">
        <div class="card-cover-wrap">
          <img class="card-cover" src="${game.cover}" alt="${game.name}" loading="lazy">
          <div class="card-banner">${game.typeLabel}</div>
        </div>
        <div class="card-info">
          <div class="card-name">${game.name}</div>
          <div class="card-name-en">${game.nameEn}</div>
        </div>
      </div>
    `).join('');
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const game = gamesData.find(g=>g.id===parseInt(card.dataset.id));
        if(game) {
          if(checkDownloadAccess(game.id)) {
            openModal(game, card);
          }
        }
      });
    });
  }
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  if(totalPages <= 1) { pagination.innerHTML = ''; return; }
  let html = `<button class="page-btn" data-page="prev" ${currentPage===1?'disabled':''}>◀</button>`;
  const maxShow = 5;
  let startP = Math.max(1, currentPage - Math.floor(maxShow/2));
  let endP = Math.min(totalPages, startP + maxShow - 1);
  if(endP - startP < maxShow - 1) startP = Math.max(1, endP - maxShow + 1);
  if(startP > 1) { html += `<button class="page-btn" data-page="1">1</button>`; if(startP>2) html += `<span class="page-ellipsis">…</span>`; }
  for(let i=startP; i<=endP; i++) html += `<button class="page-btn ${i===currentPage?'active':''}" data-page="${i}">${i}</button>`;
  if(endP < totalPages) { if(endP<totalPages-1) html += `<span class="page-ellipsis">…</span>`; html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`; }
  html += `<button class="page-btn" data-page="next" ${currentPage===totalPages?'disabled':''}>▶</button>`;
  pagination.innerHTML = html;
  pagination.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if(page==='prev') currentPage = Math.max(1, currentPage-1);
      else if(page==='next') currentPage = Math.min(totalPages, currentPage+1);
      else currentPage = parseInt(page);
      renderPage();
      window.scrollTo({ top: 400, behavior: 'smooth' });
    });
  });
}
// ===== 详情弹窗 =====
function getCardOrigin(card) {
  const rect = card.getBoundingClientRect();
  return { x: rect.left+rect.width/2-innerWidth/2, y: rect.top+rect.height/2-innerHeight/2 };
}
function openModal(game, card) {
  lastClickedCard = card;
  document.getElementById('modalCover').src = game.cover;
  document.getElementById('modalTitle').textContent = game.name;
  document.getElementById('modalTitleEn').textContent = game.nameEn;
  document.getElementById('modalTypeBadge').textContent = game.typeLabel;
  document.getElementById('modalDesc').textContent = game.description;
  const row = document.getElementById('modalScreenshots');
  row.innerHTML = game.screenshots.map((src,i)=>`
    <div class="screenshot-thumb" data-src="${src}" data-index="${i}" data-game-id="${game.id}">
      <img src="${src}" alt="截图${i+1}" loading="lazy">
    </div>
  `).join('');
  row.scrollLeft = 0;

  // ========== 修改点：自动识别迅雷/夸克链接，修改下载按钮 ==========
  const downloadLinkEl = document.getElementById('downloadLink');
  if(game.thunderLink){
    downloadLinkEl.href = game.thunderLink;
    downloadLinkEl.innerHTML = `<span>☁️</span><span>迅雷网盘下载</span>`;
  }else if(game.quarkLink){
    downloadLinkEl.href = game.quarkLink;
    downloadLinkEl.innerHTML = `<span>☁️</span><span>夸克网盘下载</span>`;
  }else{
    downloadLinkEl.href = "#";
    downloadLinkEl.innerHTML = `<span>⚠️</span><span>暂无下载链接</span>`;
  }

  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  const origin = getCardOrigin(card);
  const keyframes = [
    { transform: `translate(${origin.x}px,${origin.y}px) scale(0.2)`, opacity:0, borderRadius:'30px' },
    { transform: `translate(${origin.x*0.08}px,${origin.y*0.08}px) scale(1.04)`, opacity:0.9, borderRadius:'14px', offset:0.45 },
    { transform: 'translate(0,0) scale(0.98)', opacity:1, borderRadius:'14px', offset:0.72 },
    { transform: 'translate(0,0) scale(1)', opacity:1, borderRadius:'14px' }
  ];
  modalContent.animate(keyframes, { duration:600, easing:'cubic-bezier(0.22,0.61,0.36,1)', fill:'forwards' });
}
function closeModal() {
  let origin = { x:0, y:0 };
  if(lastClickedCard) origin = getCardOrigin(lastClickedCard);
  const keyframes = [
    { transform:'translate(0,0) scale(1)', opacity:1, borderRadius:'14px' },
    { transform:`translate(${origin.x*0.1}px,${origin.y*0.1}px) scale(1.03)`, opacity:0.7, borderRadius:'16px', offset:0.2 },
    { transform:`translate(${origin.x}px,${origin.y}px) scale(0.15)`, opacity:0, borderRadius:'30px' }
  ];
  const anim = modalContent.animate(keyframes, { duration:450, easing:'cubic-bezier(0.55,0.06,0.68,0.19)', fill:'forwards' });
  anim.onfinish = () => { modalOverlay.classList.remove('active'); document.body.style.overflow=''; };
}
// ===== 输入框实时验证 =====
function setupInputValidation() {
  document.querySelectorAll('.auth-input').forEach(input => {
    input.addEventListener('input', function() {
      this.classList.remove('error', 'success');
    });
    
    input.addEventListener('blur', function() {
      if (this.id === 'loginEmail' || this.id === 'registerEmail' || this.id === 'forgotEmail') {
        const val = this.value.trim();
        if (val && !isValidEmail(val)) {
          showToast('⚠️ 请输入有效的邮箱地址', 'warning');
          this.classList.add('error');
        } else if (val && isValidEmail(val)) {
          this.classList.add('success');
        }
      }
      
      if (this.id === 'registerConfirm') {
        const pwd = document.getElementById('registerPassword').value;
        if (this.value && this.value !== pwd) {
          showToast('❌ 两次密码不一致', 'error');
          this.classList.add('error');
        } else if (this.value && this.value === pwd) {
          this.classList.add('success');
        }
      }
      
      if (this.id === 'confirmNewPassword') {
        const pwd = document.getElementById('newPassword').value;
        if (this.value && this.value !== pwd) {
          showToast('❌ 两次密码不一致', 'error');
          this.classList.add('error');
        } else if (this.value && this.value === pwd) {
          this.classList.add('success');
        }
      }
    });
  });
}
// ===== 事件 =====
function setupEvents() {
  tagsContainer.addEventListener('click', e => {
    const tag = e.target.closest('.tag'); if(!tag) return;
    document.querySelectorAll('.tag').forEach(t=>t.classList.remove('active'));
    tag.classList.add('active'); currentFilter = tag.dataset.type; currentPage = 1; renderPage();
  });
  searchBtn.addEventListener('click', ()=>{ currentSearch=searchInput.value; currentPage=1; renderPage(); });
  searchInput.addEventListener('keypress', e=>{ if(e.key==='Enter'){ currentSearch=searchInput.value; currentPage=1; renderPage(); } });
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e=>{ if(e.target===modalOverlay) closeModal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && modalOverlay.classList.contains('active')) closeModal(); });
  document.getElementById('sliderPrev').addEventListener('click', ()=>{ document.getElementById('modalScreenshots').scrollBy({left:-185,behavior:'smooth'}); });
  document.getElementById('sliderNext').addEventListener('click', ()=>{ document.getElementById('modalScreenshots').scrollBy({left:185,behavior:'smooth'}); });
  // 截图放大
  document.addEventListener('click', e => {
    const thumb = e.target.closest('.screenshot-thumb'); if(!thumb) return;
    const gameId = parseInt(thumb.dataset.gameId), idx = parseInt(thumb.dataset.index);
    const game = gamesData.find(g=>g.id===gameId); if(!game) return;
    const screenshots = game.screenshots;
    let zoomIdx = idx;
    const overlay = document.createElement('div'); overlay.className='img-zoom-overlay';
    const closeBtn = document.createElement('button'); closeBtn.className='zoom-close-btn'; closeBtn.innerHTML='✕';
    closeBtn.addEventListener('click', ev=>{ ev.stopPropagation(); closeZoom(); });
    const wrapper = document.createElement('div'); wrapper.className='img-zoom-wrapper';
    const prevBtn = document.createElement('button'); prevBtn.className='zoom-nav-btn'; prevBtn.textContent='◀';
    prevBtn.addEventListener('click', ev=>{ ev.stopPropagation(); zoomIdx=(zoomIdx-1+screenshots.length)%screenshots.length; img.src=screenshots[zoomIdx]; });
    const img = document.createElement('img'); img.src=screenshots[idx];
    const nextBtn = document.createElement('button'); nextBtn.className='zoom-nav-btn'; nextBtn.textContent='▶';
    nextBtn.addEventListener('click', ev=>{ ev.stopPropagation(); zoomIdx=(zoomIdx+1)%screenshots.length; img.src=screenshots[zoomIdx]; });
    wrapper.appendChild(prevBtn); wrapper.appendChild(img); wrapper.appendChild(nextBtn);
    overlay.appendChild(closeBtn); overlay.appendChild(wrapper);
    document.body.appendChild(overlay); document.body.style.overflow='hidden';
    function handleKey(e){
      if(e.key==='ArrowLeft'){ zoomIdx=(zoomIdx-1+screenshots.length)%screenshots.length; img.src=screenshots[zoomIdx]; }
      else if(e.key==='ArrowRight'){ zoomIdx=(zoomIdx+1)%screenshots.length; img.src=screenshots[zoomIdx]; }
      else if(e.key==='Escape'){ closeZoom(); }
    }
    document.addEventListener('keydown', handleKey);
    function closeZoom(){
      document.removeEventListener('keydown', handleKey);
      overlay.style.opacity='0'; setTimeout(()=>{ if(overlay.parentNode)overlay.parentNode.removeChild(overlay); document.body.style.overflow=''; },200);
    }
    overlay.addEventListener('click', ev=>{ if(ev.target===overlay) closeZoom(); });
  });
  // ===== 登录弹窗事件 =====
  document.getElementById('authClose').addEventListener('click', closeAuth);
  authOverlay.addEventListener('click', e=>{ if(e.target===authOverlay) closeAuth(); });
  document.getElementById('tabLogin').addEventListener('click', switchToLoginView);
  document.getElementById('tabRegister').addEventListener('click', switchToRegisterView);
  document.getElementById('switchToRegister').addEventListener('click', switchToRegisterView);
  document.getElementById('switchToLogin').addEventListener('click', switchToLoginView);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  // ===== 忘记密码事件 =====
  document.getElementById('forgotPasswordLink').addEventListener('click', e => {
    e.preventDefault();
    if (currentUser) {
      closeAuth();
      openChangePwd();
      showToast('ℹ️ 请直接修改密码', 'info');
      return;
    }
    openForgot();
  });
  document.getElementById('forgotForm').addEventListener('submit', handleForgotPassword);
  document.getElementById('forgotClose').addEventListener('click', closeForgot);
  document.getElementById('forgotOk').addEventListener('click', closeForgot);
  forgotOverlay.addEventListener('click', e=>{ if(e.target===forgotOverlay) closeForgot(); });
  document.getElementById('copyWechat').addEventListener('click', ()=>{ 
    navigator.clipboard.writeText('GameTogether1').then(()=>{
      showToast('✅ 已复制微信号', 'success');
    }).catch(()=>{
      showToast('✅ 微信号: GameTogether1', 'success');
    });
  });
  // ===== 修改密码事件 =====
  document.getElementById('changePwdClose').addEventListener('click', closeChangePwd);
  changePwdOverlay.addEventListener('click', e=>{ if(e.target===changePwdOverlay) closeChangePwd(); });
  document.getElementById('changePwdForm').addEventListener('submit', handleChangePassword);
  // ===== 会员弹窗事件 =====
  document.getElementById('memberClose').addEventListener('click', closeMemberModal);
  memberOverlay.addEventListener('click', e=>{ if(e.target===memberOverlay) closeMemberModal(); });
  document.getElementById('gotoVipBtn').addEventListener('click', openVIPModal);
  document.getElementById('cancelMemberBtn').addEventListener('click', closeMemberModal);
  // ===== VIP开通事件 =====
  document.getElementById('vipClose').addEventListener('click', closeVIPModal);
  vipOverlay.addEventListener('click', e=>{ if(e.target===vipOverlay) closeVIPModal(); });
  document.getElementById('paidBtn').addEventListener('click', openOrderModal);
  // ===== 订单事件 =====
  document.getElementById('cancelOrder').addEventListener('click', closeOrderModal);
  const orderInput = document.getElementById('orderNumber');
  orderInput.addEventListener('input', () => {
    orderInput.value = orderInput.value.replace(/\D/g, '');
    updateOrderDots();
  });
  document.getElementById('submitOrder').addEventListener('click', submitOrder);
  // ===== 输入验证 =====
  setupInputValidation();
  
  // ===== 密码强度 =====
  setupPasswordStrength('registerPassword', 'passwordStrength', 'strengthIndicator');
  setupPasswordStrength('newPassword', 'changePwdStrength', 'changeStrengthIndicator');
}
// ===== 启动 =====
async function init() {
  resizeParticles(); 
  initParticles(); 
  animId = requestAnimationFrame(animateParticles);
  await checkAuthStatus();
  renderTags(); 
  renderPage(); 
  setupEvents();
  console.log('✅ 网站初始化完成');
}
window.addEventListener('resize', ()=>{ resizeParticles(); initParticles(); });
document.addEventListener('mousemove', e=>{ mouseX=e.clientX; mouseY=e.clientY; });
document.addEventListener('mouseleave', ()=>{ mouseX=-1000; mouseY=-1000; });
init();
