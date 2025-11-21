/**
 * View all tasks in Todoist
 */
import * as todoist from '../src/modules/productivity/todoist';

const API_KEY = process.env.TODOIST_API_KEY || '';

if (!API_KEY) {
  console.error('❌ Error: TODOIST_API_KEY environment variable is required');
  console.error('   Set it with: export TODOIST_API_KEY=your_api_key');
  process.exit(1);
}

async function viewAllTasks() {
  console.log('📋 Fetching all tasks from Todoist...\n');

  try {
    const tasks = await todoist.getAllTasks({
      apiKey: API_KEY
    });

    console.log(`✅ Found ${tasks.length} active tasks\n`);
    console.log('━'.repeat(80));

    tasks.forEach((task, index) => {
      console.log(`\n${index + 1}. ${task.content}`);
      console.log(`   ID: ${task.id}`);
      if (task.description) {
        console.log(`   Description: ${task.description.substring(0, 100)}...`);
      }
      console.log(`   Priority: ${task.priority} (${getPriorityLabel(task.priority)})`);
      if (task.due) {
        console.log(`   Due: ${task.due.string}`);
      }
      if (task.labels.length > 0) {
        console.log(`   Labels: ${task.labels.join(', ')}`);
      }
      console.log(`   URL: ${task.url}`);
    });

    console.log('\n' + '━'.repeat(80));
    console.log(`\n📊 Total: ${tasks.length} active tasks`);

    return tasks;
  } catch (error) {
    console.error('❌ Error fetching tasks:', error);
    throw error;
  }
}

function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1: return '🔴 Urgent';
    case 2: return '🟠 High';
    case 3: return '🟡 Medium';
    case 4: return '🟢 Low';
    default: return '⚪ None';
  }
}

// Run it
viewAllTasks()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error.message);
    process.exit(1);
  });
