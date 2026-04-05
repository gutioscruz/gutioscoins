import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envText = readFileSync('.env', 'utf-8');
const env = {};
envText.split(/\r?\n/).forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v) {
    env[k.trim()] = v.join('=').trim().replace(/^"|'$/g, '').replace(/"$/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data: cards } = await supabase.from('cards').select('id, name, closing_day, due_day');
  console.log('Cards:', cards);

  // We loop to see all cards stats
  for (const card of cards || []) {
    const { data: txs } = await supabase
      .from('transactions')
      .select('id, description, amount, date, type, is_installment')
      .eq('card_id', card.id)
      .order('date', { ascending: false });
    
    console.log(`\nCard ${card.name} (${card.id})`);
    if(txs) {
       const marchTxs = txs.filter(t => t.date.includes('2026-03'));
       const totalMarch = marchTxs.reduce((sum, t) => sum + Number(t.amount), 0);
       console.log('Total March Txs amount:', totalMarch);
       console.log('Txs count in March:', marchTxs.length);
       if(marchTxs.length > 0) {
           console.log('Sample march txs:', marchTxs.slice(0, 5).map(t => `${t.date.split('T')[0]} ${t.amount}`));
       }
    }
  }
}
run();
