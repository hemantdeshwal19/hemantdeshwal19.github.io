(()=>{
 const scenarios={ordinary:{amount:100,merchant:'amazon.com',last4:'1234'},large:{amount:10000,merchant:'amazon.com',last4:'1234'},combined:{amount:6000,merchant:'shadystore.com',last4:'9999'}};
 function scoreTransaction(tx){let score=0;const reasons=[];if(['shadystore.com','fraudshop.net'].includes(tx.merchant)){score+=80;reasons.push('Blocked merchant +80')}if(tx.amount>=10000){score+=60;reasons.push('Amount ≥ $10,000 +60')}else if(tx.amount>=5000){score+=30;reasons.push('Amount ≥ $5,000 +30')}if(['0000','9999'].includes(tx.last4)){score+=40;reasons.push('Suspicious last4 +40')}score=Math.min(100,score);return {score,risk:score>=60?'High':score>=30?'Medium':'Low',reasons};}
 document.querySelectorAll('[data-scenario]').forEach(button=>button.addEventListener('click',()=>{
  const tx=scenarios[button.dataset.scenario],result=scoreTransaction(tx);finishBuild(true);
  document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.getElementById('demo-input').textContent=`$${tx.amount.toLocaleString('en-US')} · ${tx.merchant} · last4 ${tx.last4}`;
  const score=document.getElementById('demo-score');score.replaceChildren(document.createTextNode(String(result.score)));const suffix=document.createElement('span');suffix.textContent='/100';score.append(suffix);
  document.getElementById('demo-decision').textContent=`${result.risk} risk · ${result.score>=60?'Blocked':'Approved'}`;
  document.getElementById('demo-reason').textContent=result.reasons.length?result.reasons.join(' + ') +(result.reasons.length>1?'. Total capped at 100.':'.'):'No configured risk signals matched.';
 }));
})();
