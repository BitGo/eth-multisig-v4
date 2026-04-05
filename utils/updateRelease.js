const fs = require('fs');

module.exports = async ({ github, context }) => {
  let json;
  let html = [];

  // Read and parse the JSON file
  try {
    json = JSON.parse(fs.readFileSync('./output.json').toString());
    for (const key in json) {
      html.push(`${key}: ${json[key]}`);
    }
  } catch (err) {
    console.error("Error reading or parsing 'output.json':", err.message);
    return;
  }

  // Join the HTML content
  let htmlContent = html.join('<br>');

  try {
    // Get the current ref (tag/branch) from the workflow_dispatch context
    let tagName = null;

    console.log('Workflow context info:');
    console.log('- Event:', context.eventName);
    console.log('- Ref:', context.ref);
    console.log('- SHA:', context.sha);

    // Check if we're running from a tag (eg :- refs/tags/v4.0-thbarevm)
    if (context.ref && context.ref.startsWith('refs/tags/')) {
      // Extract tag name from refs/tags/v1.0.0 -> v1.0.0
      tagName = context.ref.replace('refs/tags/', '');
      console.log(`Running from tag: ${tagName}`);
    }

    if (!tagName) {
      throw new Error(
        'Not running from a tag. Exiting without updating release.'
      );
    }

    // Get the specific release by tag
    const response = await github.rest.repos.getReleaseByTag({
      owner: context.repo.owner,
      repo: context.repo.repo,
      tag: tagName
    });

    // Update the release with the new notes
    await github.rest.repos.updateRelease({
      owner: context.repo.owner,
      repo: context.repo.repo,
      release_id: response.data.id,
      body: htmlContent
    });

    console.log(
      `Successfully updated release ${tagName} with new deployment information`
    );
  } catch (err) {
    console.error('Error fetching or updating the release:', err.message);
    throw err;
  }
};
