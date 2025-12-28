import { ask, chat, chatStream } from '@research/openai-utils';

async function main() {
  console.log('=== OpenAI Utils Demo ===\n');

  // Simple ask - just get the text
  console.log('1. Simple ask:');
  const answer = await ask('What is 2+2? Reply with just the number.');
  console.log(`   Answer: ${answer}\n`);

  // Chat with full response details
  console.log('2. Chat with details:');
  const response = await chat('Explain recursion in one sentence.', {
    model: 'gpt-4o-mini',
    temperature: 0.7,
  });
  console.log(`   Response: ${response.content}`);
  console.log(`   Tokens: ${response.usage.totalTokens}\n`);

  // With system prompt
  console.log('3. With system prompt:');
  const pirate = await ask('How are you today?', {
    systemPrompt: 'You are a friendly pirate. Keep responses brief.',
  });
  console.log(`   Pirate says: ${pirate}\n`);

  // Streaming
  console.log('4. Streaming response:');
  process.stdout.write('   ');
  for await (const chunk of chatStream('Count from 1 to 5 slowly.')) {
    process.stdout.write(chunk);
  }
  console.log('\n');

  console.log('=== Demo Complete ===');
}

main().catch(console.error);
