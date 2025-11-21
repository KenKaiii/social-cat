/**
 * Comprehensive test of ALL 27 Todoist API endpoints
 * Tests every function with real API and cleans up
 */
import * as todoist from '../src/modules/productivity/todoist';

const API_KEY = process.env.TODOIST_API_KEY || '';

if (!API_KEY) {
  console.error('❌ Error: TODOIST_API_KEY environment variable is required');
  console.error('   Set it with: export TODOIST_API_KEY=your_api_key');
  process.exit(1);
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

const results: TestResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

async function testEndpoint(name: string, fn: () => Promise<unknown>) {
  results.total++;
  try {
    await fn();
    results.passed++;
    console.log(`   ✅ ${name}`);
    return true;
  } catch (error) {
    results.failed++;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.errors.push(`${name}: ${errorMsg}`);
    console.log(`   ❌ ${name}: ${errorMsg}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Testing ALL 27 Todoist Endpoints\n');
  console.log('━'.repeat(80));

  // Store IDs for cleanup
  let projectId: string | undefined;
  let sectionId: string | undefined;
  let taskId: string | undefined;
  let commentId: string | undefined;
  let labelId: string | undefined;

  // ============================================================================
  // PROJECT OPERATIONS (5 endpoints)
  // ============================================================================
  console.log('\n📁 PROJECT OPERATIONS (5 endpoints)\n');

  await testEndpoint('createProject', async () => {
    const project = await todoist.createProject({
      name: '[B0T TEST] Complete API Test Project',
      color: 'blue',
      isFavorite: false,
      apiKey: API_KEY
    });
    projectId = project.id;
    console.log(`      Created project ID: ${projectId}`);
  });

  await testEndpoint('getAllProjects', async () => {
    const projects = await todoist.getAllProjects({ apiKey: API_KEY });
    console.log(`      Found ${projects.length} projects`);
  });

  await testEndpoint('getProject', async () => {
    if (!projectId) throw new Error('No project ID');
    const project = await todoist.getProject({
      projectId,
      apiKey: API_KEY
    });
    console.log(`      Retrieved: ${project.name}`);
  });

  await testEndpoint('updateProject', async () => {
    if (!projectId) throw new Error('No project ID');
    const project = await todoist.updateProject({
      projectId,
      name: '[B0T TEST] Updated Project Name',
      color: 'red',
      apiKey: API_KEY
    });
    console.log(`      Updated to: ${project.name}`);
  });

  // Keep project for now, delete at end

  // ============================================================================
  // SECTION OPERATIONS (5 endpoints)
  // ============================================================================
  console.log('\n📂 SECTION OPERATIONS (5 endpoints)\n');

  await testEndpoint('createSection', async () => {
    if (!projectId) throw new Error('No project ID');
    const section = await todoist.createSection({
      name: 'Test Section',
      projectId,
      apiKey: API_KEY
    });
    sectionId = section.id;
    console.log(`      Created section ID: ${sectionId}`);
  });

  await testEndpoint('getAllSections', async () => {
    const sections = await todoist.getAllSections({
      projectId,
      apiKey: API_KEY
    });
    console.log(`      Found ${sections.length} sections in project`);
  });

  await testEndpoint('getSection', async () => {
    if (!sectionId) throw new Error('No section ID');
    const section = await todoist.getSection({
      sectionId,
      apiKey: API_KEY
    });
    console.log(`      Retrieved: ${section.name}`);
  });

  await testEndpoint('updateSection', async () => {
    if (!sectionId) throw new Error('No section ID');
    const section = await todoist.updateSection({
      sectionId,
      name: 'Updated Test Section',
      apiKey: API_KEY
    });
    console.log(`      Updated to: ${section.name}`);
  });

  // Keep section for now, delete at end

  // ============================================================================
  // TASK OPERATIONS (7 endpoints)
  // ============================================================================
  console.log('\n✅ TASK OPERATIONS (7 endpoints)\n');

  await testEndpoint('createTask', async () => {
    const task = await todoist.createTask({
      content: '[B0T TEST] Complete endpoint test task',
      description: 'Testing all Todoist API endpoints',
      priority: 2,
      projectId,
      sectionId,
      dueString: 'tomorrow',
      apiKey: API_KEY
    });
    taskId = task.id;
    console.log(`      Created task ID: ${taskId}`);
  });

  await testEndpoint('getAllTasks', async () => {
    const tasks = await todoist.getAllTasks({
      projectId,
      apiKey: API_KEY
    });
    console.log(`      Found ${tasks.length} tasks in project`);
  });

  await testEndpoint('getTask', async () => {
    if (!taskId) throw new Error('No task ID');
    const task = await todoist.getTask({
      taskId,
      apiKey: API_KEY
    });
    console.log(`      Retrieved: ${task.content}`);
  });

  await testEndpoint('updateTask', async () => {
    if (!taskId) throw new Error('No task ID');
    const task = await todoist.updateTask({
      taskId,
      content: '[B0T TEST] UPDATED task',
      priority: 3,
      apiKey: API_KEY
    });
    console.log(`      Updated to: ${task.content}`);
  });

  // ============================================================================
  // COMMENT OPERATIONS (5 endpoints)
  // ============================================================================
  console.log('\n💬 COMMENT OPERATIONS (5 endpoints)\n');

  await testEndpoint('createComment', async () => {
    if (!taskId) throw new Error('No task ID');
    const comment = await todoist.createComment({
      taskId,
      content: 'This is a test comment from b0t',
      apiKey: API_KEY
    });
    commentId = comment.id;
    console.log(`      Created comment ID: ${commentId}`);
  });

  await testEndpoint('getAllComments', async () => {
    if (!taskId) throw new Error('No task ID');
    const comments = await todoist.getAllComments({
      taskId,
      apiKey: API_KEY
    });
    console.log(`      Found ${comments.length} comments on task`);
  });

  await testEndpoint('getComment', async () => {
    if (!commentId) throw new Error('No comment ID');
    const comment = await todoist.getComment({
      commentId,
      apiKey: API_KEY
    });
    console.log(`      Retrieved: ${comment.content.substring(0, 30)}...`);
  });

  await testEndpoint('updateComment', async () => {
    if (!commentId) throw new Error('No comment ID');
    await todoist.updateComment({
      commentId,
      content: 'Updated test comment from b0t',
      apiKey: API_KEY
    });
    console.log(`      Updated comment`);
  });

  await testEndpoint('deleteComment', async () => {
    if (!commentId) throw new Error('No comment ID');
    await todoist.deleteComment({
      commentId,
      apiKey: API_KEY
    });
    console.log(`      Deleted comment ${commentId}`);
  });

  // ============================================================================
  // LABEL OPERATIONS (5 endpoints)
  // ============================================================================
  console.log('\n🏷️  LABEL OPERATIONS (5 endpoints)\n');

  await testEndpoint('createLabel', async () => {
    const label = await todoist.createLabel({
      name: 'b0t-test-label',
      color: 'grape',
      isFavorite: false,
      apiKey: API_KEY
    });
    labelId = label.id;
    console.log(`      Created label ID: ${labelId}`);
  });

  await testEndpoint('getAllLabels', async () => {
    const labels = await todoist.getAllLabels({ apiKey: API_KEY });
    console.log(`      Found ${labels.length} labels`);
  });

  await testEndpoint('getLabel', async () => {
    if (!labelId) throw new Error('No label ID');
    const label = await todoist.getLabel({
      labelId,
      apiKey: API_KEY
    });
    console.log(`      Retrieved: ${label.name}`);
  });

  await testEndpoint('updateLabel', async () => {
    if (!labelId) throw new Error('No label ID');
    const label = await todoist.updateLabel({
      labelId,
      name: 'b0t-updated-label',
      color: 'orange',
      apiKey: API_KEY
    });
    console.log(`      Updated to: ${label.name}`);
  });

  await testEndpoint('deleteLabel', async () => {
    if (!labelId) throw new Error('No label ID');
    await todoist.deleteLabel({
      labelId,
      apiKey: API_KEY
    });
    console.log(`      Deleted label ${labelId}`);
  });

  // ============================================================================
  // TASK COMPLETION (2 endpoints)
  // ============================================================================
  console.log('\n🔄 TASK COMPLETION (2 endpoints)\n');

  await testEndpoint('closeTask', async () => {
    if (!taskId) throw new Error('No task ID');
    await todoist.closeTask({
      taskId,
      apiKey: API_KEY
    });
    console.log(`      Closed task ${taskId}`);
  });

  await testEndpoint('reopenTask', async () => {
    if (!taskId) throw new Error('No task ID');
    await todoist.reopenTask({
      taskId,
      apiKey: API_KEY
    });
    console.log(`      Reopened task ${taskId}`);
  });

  // ============================================================================
  // CLEANUP (2 endpoints)
  // ============================================================================
  console.log('\n🧹 CLEANUP\n');

  await testEndpoint('deleteTask', async () => {
    if (!taskId) throw new Error('No task ID');
    await todoist.deleteTask({
      taskId,
      apiKey: API_KEY
    });
    console.log(`      Deleted task ${taskId}`);
  });

  await testEndpoint('deleteSection', async () => {
    if (!sectionId) throw new Error('No section ID');
    await todoist.deleteSection({
      sectionId,
      apiKey: API_KEY
    });
    console.log(`      Deleted section ${sectionId}`);
  });

  await testEndpoint('deleteProject', async () => {
    if (!projectId) throw new Error('No project ID');
    await todoist.deleteProject({
      projectId,
      apiKey: API_KEY
    });
    console.log(`      Deleted project ${projectId}`);
  });

  // ============================================================================
  // FINAL RESULTS
  // ============================================================================
  console.log('\n' + '━'.repeat(80));
  console.log('\n📊 TEST RESULTS\n');
  console.log(`   Total Endpoints: ${results.total}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ ERRORS:\n');
    results.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }

  console.log('\n' + '━'.repeat(80));

  if (results.failed === 0) {
    console.log('\n🎉 ALL ENDPOINTS WORKING PERFECTLY!\n');
    return true;
  } else {
    console.log('\n⚠️  SOME ENDPOINTS FAILED - SEE ERRORS ABOVE\n');
    return false;
  }
}

// Run all tests
runAllTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });
