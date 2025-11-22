/**
 * Test Todoist Label operations with real API
 */
import * as todoist from '../src/modules/productivity/todoist';

const API_KEY = process.env.TODOIST_API_KEY || '';

if (!API_KEY) {
  console.error('❌ Error: TODOIST_API_KEY environment variable is required');
  console.error('   Set it with: export TODOIST_API_KEY=your_api_key');
  process.exit(1);
}

async function testLabels() {
  console.log('🏷️  Testing Todoist Labels...\n');

  try {
    // 1. Get all existing labels
    console.log('1️⃣  Getting all labels...');
    const existingLabels = await todoist.getAllLabels({ apiKey: API_KEY });
    console.log(`   ✅ Found ${existingLabels.length} existing labels`);
    existingLabels.forEach((label, i) => {
      console.log(`      ${i + 1}. ${label.name} (${label.color})`);
    });

    // 2. Create a new label
    console.log('\n2️⃣  Creating new label...');
    const newLabel = await todoist.createLabel({
      name: 'b0t-test',
      color: 'grape',
      isFavorite: false,
      apiKey: API_KEY
    });
    console.log(`   ✅ Created label: ${newLabel.name} (ID: ${newLabel.id})`);
    console.log(`      Color: ${newLabel.color}`);
    console.log(`      Favorite: ${newLabel.is_favorite}`);

    // 3. Get the specific label
    console.log('\n3️⃣  Getting label by ID...');
    const fetchedLabel = await todoist.getLabel({
      labelId: newLabel.id,
      apiKey: API_KEY
    });
    console.log(`   ✅ Retrieved: ${fetchedLabel.name}`);

    // 4. Update the label
    console.log('\n4️⃣  Updating label...');
    const updatedLabel = await todoist.updateLabel({
      labelId: newLabel.id,
      name: 'b0t-test-updated',
      color: 'orange',
      isFavorite: true,
      apiKey: API_KEY
    });
    console.log(`   ✅ Updated to: ${updatedLabel.name}`);
    console.log(`      New color: ${updatedLabel.color}`);
    console.log(`      Favorite: ${updatedLabel.is_favorite}`);

    // 5. Get all labels again to verify
    console.log('\n5️⃣  Verifying label in list...');
    const allLabels = await todoist.getAllLabels({ apiKey: API_KEY });
    const foundLabel = allLabels.find(l => l.id === newLabel.id);
    if (foundLabel) {
      console.log(`   ✅ Label found in list: ${foundLabel.name}`);
    }

    // 6. Delete the label (cleanup)
    console.log('\n6️⃣  Cleaning up - deleting test label...');
    await todoist.deleteLabel({
      labelId: newLabel.id,
      apiKey: API_KEY
    });
    console.log(`   ✅ Deleted label: ${newLabel.id}`);

    // 7. Verify deletion
    console.log('\n7️⃣  Verifying deletion...');
    const finalLabels = await todoist.getAllLabels({ apiKey: API_KEY });
    const stillExists = finalLabels.find(l => l.id === newLabel.id);
    if (!stillExists) {
      console.log('   ✅ Label successfully deleted');
    } else {
      console.log('   ⚠️  Label still exists');
    }

    console.log('\n✨ All label operations completed successfully!\n');

    return {
      success: true,
      totalLabels: finalLabels.length
    };
  } catch (error) {
    console.error('\n❌ Error testing labels:', error);
    throw error;
  }
}

// Run it
testLabels()
  .then((result) => {
    console.log('📊 Final State:');
    console.log(`   Total labels: ${result.totalLabels}`);
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });
