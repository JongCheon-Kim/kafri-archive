
const chat=document.getElementById('chat');
const q=document.getElementById('q');
const send=document.getElementById('send');

function addBubble(text,who='bot'){
  const div=document.createElement('div');
  div.className='bubble '+who;
  div.textContent=text;
  chat.appendChild(div);
  chat.scrollTop=chat.scrollHeight;
}

addBubble("안녕하세요! 어촌·수산물 Q&A 테스트 챗봇입니다.");

function reply(text){
  if(text.includes('멸치')) return '멸치 관련 데이터: 조선시대 진상품 기록 다수 (데모)';
  return `“${text}” 에 대한 예시 응답입니다.`;
}

function handle(){
  const text=q.value.trim();
  if(!text) return;
  addBubble(text,'user');
  q.value='';
  setTimeout(()=>addBubble(reply(text),'bot'),400);
}

send.onclick=handle;
q.addEventListener('keydown',e=>{if(e.key==='Enter') handle();});
