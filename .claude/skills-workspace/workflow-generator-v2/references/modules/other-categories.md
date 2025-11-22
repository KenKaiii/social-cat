# Other Module Categories Reference

## Content (Media & Design)

**Platforms:** Canva, Figma, Unsplash, Pexels
**Search:** `curl "http://localhost:3123/api/modules/search?q=&limit=5"<platform-name>`

Example:
```yaml
- module: content.unsplash.searchPhotos
  id: get-images
  inputs:
    query: "nature"
    perPage: 10
```

## DevTools (CI/CD & Monitoring)

**Platforms:** GitHub, Vercel, Netlify, Sentry, DataDog
**Search:** `curl "http://localhost:3123/api/modules/search?q=github&limit=5"`

Example:
```yaml
- module: devtools.github.createIssue
  id: create-issue
  inputs:
    owner: "username"
    repo: "repository"
    title: "{{issueTitle}}"
    body: "{{issueBody}}"
```

## Leads (Lead Generation)

**Platforms:** Apollo, Hunter, Clearbit, PhantomBuster
**Search:** `curl "http://localhost:3123/api/modules/search?q=hunter&limit=5"`

Example:
```yaml
- module: leads.hunter.findEmail
  id: find-email
  inputs:
    domain: "company.com"
    firstName: "John"
    lastName: "Doe"
```

## Productivity

**Platforms:** Calendly, Linear, Typeform
**Search:** `curl "http://localhost:3123/api/modules/search?q=linear&limit=5"`

Example:
```yaml
- module: productivity.linear.createIssue
  id: create-task
  inputs:
    title: "{{taskTitle}}"
    description: "{{taskDesc}}"
```

## Video

**Platforms:** Heygen, Runway, ElevenLabs, Whisper
**Search:** `curl "http://localhost:3123/api/modules/search?q=video&limit=5"`

Example:
```yaml
- module: video.elevenlabs.textToSpeech
  id: generate-audio
  inputs:
    text: "{{scriptText}}"
    voiceId: "{{voiceId}}"
```

## DataProcessing (Big Data)

**Platforms:** BigQuery, Snowflake, Kafka
**Search:** `curl "http://localhost:3123/api/modules/search?q=&limit=5"<platform-name>`

## External APIs

**RapidAPI integration:**
Search: `curl "http://localhost:3123/api/modules/search?q=rapidapi&limit=5"`

## General Rule

For ANY module not covered in detail:
1. Search: `curl "http://localhost:3123/api/modules/search?q=&limit=5"<keyword>`
2. Check signature for parameters
3. Use template from search results
4. Add credentials if needed (auto-injected)
