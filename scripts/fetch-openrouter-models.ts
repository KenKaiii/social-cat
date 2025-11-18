/**
 * Fetch and display all available models from OpenRouter API
 * Run with: npx tsx scripts/fetch-openrouter-models.ts
 */

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    context_length?: number;
    is_moderated?: boolean;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

async function fetchOpenRouterModels() {
  try {
    console.log('🔍 Fetching models from OpenRouter API...\n');

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: OpenRouterModelsResponse = await response.json();

    console.log(`✅ Found ${data.data.length} models\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Group by provider
    const modelsByProvider: Record<string, OpenRouterModel[]> = {};

    data.data.forEach((model) => {
      const provider = model.id.split('/')[0];
      if (!modelsByProvider[provider]) {
        modelsByProvider[provider] = [];
      }
      modelsByProvider[provider].push(model);
    });

    // Sort providers alphabetically
    const providers = Object.keys(modelsByProvider).sort();

    // Display models grouped by provider
    providers.forEach((provider) => {
      const models = modelsByProvider[provider];
      console.log(`\n📦 ${provider.toUpperCase()} (${models.length} models)`);
      console.log('─────────────────────────────────────────────────────────────');

      models.forEach((model) => {
        const contextK = Math.floor(model.context_length / 1000);
        const promptPrice = parseFloat(model.pricing.prompt);
        const completionPrice = parseFloat(model.pricing.completion);

        console.log(`\n  ID: ${model.id}`);
        console.log(`  Name: ${model.name}`);
        if (model.description) {
          console.log(`  Description: ${model.description}`);
        }
        console.log(`  Context: ${contextK}K tokens`);
        console.log(
          `  Pricing: $${promptPrice}/prompt, $${completionPrice}/completion`
        );
        if (model.architecture?.modality) {
          console.log(`  Modality: ${model.architecture.modality}`);
        }
      });
    });

    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log(`   Total Models: ${data.data.length}`);
    console.log(`   Providers: ${providers.length}`);
    console.log(`   Providers: ${providers.join(', ')}\n`);

    // Save to JSON file for reference
    const fs = await import('fs');
    const path = await import('path');

    const outputPath = path.join(process.cwd(), 'openrouter-models.json');
    fs.writeFileSync(outputPath, JSON.stringify(data.data, null, 2));

    console.log(`💾 Full model list saved to: ${outputPath}\n`);
  } catch (error) {
    console.error('❌ Error fetching models:', error);
    process.exit(1);
  }
}

fetchOpenRouterModels();
