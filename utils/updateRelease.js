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
    // Fetch the release by tag
    const response = await github.rest.repos.getReleaseByTag({
      owner: context.repo.owner,
      repo: context.repo.repo,
      tag: context.payload.release.tag_name
    });

    // Update the release with the new notes
    await github.rest.repos.updateRelease({
      owner: context.repo.owner,
      repo: context.repo.repo,
      release_id: response.data.id,
      body: htmlContent
    });
  } catch (err) {
    console.error('Error fetching or updating the release:', err.message);
    throw err;
  }
};
