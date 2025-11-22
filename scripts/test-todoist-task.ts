/**
 * Create a real task in Todoist with full details
 */
import * as todoist from '../src/modules/productivity/todoist';

const API_KEY = process.env.TODOIST_API_KEY || '';

if (!API_KEY) {
  console.error('❌ Error: TODOIST_API_KEY environment variable is required');
  console.error('   Set it with: export TODOIST_API_KEY=your_api_key');
  process.exit(1);
}

async function createTestTask() {
  console.log('🚀 Creating task in Todoist...\n');

  try {
    const task = await todoist.createTask({
      content: '🤖 Test task from b0t automation platform',
      description: `This task was created using the b0t Todoist module!

**Features tested:**
- Task creation via API
- Description with markdown
- Priority setting
- Due date parsing
- Label assignment

Created at: ${new Date().toLocaleString()}`,
      priority: 3, // High priority (1=urgent, 2=high, 3=medium, 4=low)
      dueString: 'tomorrow at 3pm',
      labels: ['test', 'automation'],
      apiKey: API_KEY
    });

    console.log('✅ Task created successfully!\n');
    console.log('📋 Task Details:');
    console.log('   ID:', task.id);
    console.log('   Title:', task.content);
    console.log('   URL:', task.url);
    console.log('   Priority:', task.priority);
    console.log('   Due:', task.due?.string || 'No due date');
    console.log('   Labels:', task.labels.join(', ') || 'No labels');
    console.log('   Created:', task.created_at);
    console.log('\n🔗 Open in Todoist:', task.url);

    return task;
  } catch (error) {
    console.error('❌ Error creating task:', error);
    throw error;
  }
}

// Run it
createTestTask()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error.message);
    process.exit(1);
  });
