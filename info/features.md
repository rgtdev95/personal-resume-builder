# Features and usage

The app has five workspace sections. Switching sections preserves in-progress drafts. [architecture.md](architecture.md) describes the API and storage; [context.md](context.md) lists current limitations.

## Your profile

Save your name, email, phone, address, GitHub/LinkedIn/portfolio links, and education. Education entries can be added or removed. These details are merged into generated documents. Updating the profile does not retroactively change saved documents.

## Work history

Store detailed roles, projects, achievements, or old resume text as named entries. Entries are collapsed by default and show a character count. Expand an entry to edit its title/content, preview Markdown, and save it. Delete requires confirmation. The new-entry editor sits beside the library on larger screens.

Choose whole entries when tailoring documents. Separate jobs into different entries if you want to include them independently. New entries are selected by default when the resume editor refreshes its library; existing unchecked entries stay unchecked and deleted entries are removed.

## Applications

Each opportunity groups the role, company, and location. Other columns show status, resume/cover-letter actions, keyword match, and application date.

- Search by company, role, or location.
- Filter by All applications, Applied, Interviewing, Offers, or Closed, then optionally by an exact status. Stage counts describe all applications, independently of the search.
- Sort newest or oldest first by application date.
- Change status inline. The stage groups use the current status, not historical milestones: Interviewing includes first/second interview; Offers includes offer/accepted; Closed includes rejection, no response, unsuccessful interviews, unscheduled interviews, and declined offers.
- Select a role or its arrow to view compensation, posting URL, full stored description, documents, and edit/delete actions. On wide screens details sit beside the table; on smaller screens they appear above it. Tables can scroll horizontally.
- Add applications manually without generating documents. New applications start at Applied; change the status after saving if needed.
- Open saved documents or go to the resume editor to generate them. Deleting an application also deletes its generated documents after confirmation.

## Resume & cover letter

1. Add your profile and work history first.
2. Paste the full job description. The posting URL is optional; the app reads the pasted description and does not fetch the URL.
3. Select the work-history entries to use. Entries default to selected. **Current limitation:** clearing every checkbox still causes the backend to use all entries.
4. Select **Generate resume**. The client extracts company, role, compensation, and location, checks for an existing application, and then requests generation. An existing company/role match pauses the flow with a choice to view the existing application or proceed.
5. Review the extracted job details and resulting document. Missing company/title values use editable tracker placeholders. Extraction runs again when Generate resume is selected and can replace manually entered job details.
6. Once a resume is available in the current draft, **Generate cover letter** is shown. The cover-letter prompt uses selected work history and the stored structured resume when available. Loading a saved application can currently leave this button hidden until a resume is generated again because the single-application endpoint omits document IDs.
7. **Clear draft** resets the editor; it does not undo saved documents or remove application records. Application creation occurs before document generation completes, so failures can leave an application in the tracker.

Generating a resume creates or updates its application and saves a document automatically. Regenerating a document replaces the saved document of that type for the same application. Reopening the same application from the tracker reloads its draft.

The server extracts required keywords, then asks the writer to tailor content using only the supplied work history. Prompt rules request all roles in the selected entries, substantive bullets without a fixed count, categorized plain-text skills, and no invented claims. These are instructions to the model, not guarantees: review every generated document before using it.

The cover-letter checkbox records whether this application uses a cover letter. It does not automatically generate one.

## Keyword match

After resume generation, code checks which extracted must-have keywords literally appear in the structured resume. The percentage is shown in Applications and the generation result. The document viewer shows matched/missing terms. Matching is case-insensitive and allows plural endings; synonyms may count as missing. No extracted keywords means no score.

This measures keyword coverage, not hiring likelihood. The match banner is excluded from printing. Manual document edits do not recalculate it.

## Document editing and PDF export

Saved documents open at document.html?id=... in a separate page. Click inside the document to edit, then select **Save** to persist the HTML. Edits are not automatically saved. **Print / Save as PDF** opens the browser print dialog; select a PDF destination there. Contact links display readable URLs.

Only HTML is edited: the original structured content remains unchanged, including the data used as context for a later cover letter. Regenerating overwrites the saved document, including manual HTML edits.

## Application insights

A live Sankey chart groups applications by cover-letter usage and hiring-stage outcomes. It derives paths from each application's current status, with explicit in-progress leaves where needed. It is not a time-series event history. Revisit the section to refresh the report after status changes. An expandable table provides the actual source stage, destination stage, and application count for every chart link.

## Typical workflow

Save your profile, build your experience library, paste a posting in Resume & cover letter, generate and review documents, save edits, and print/export. Track the application and update its status as responses arrive. Use Application insights to review outcomes. You can also track applications manually without using AI generation.

## Data and privacy

Data stays in a local SQLite file, but generation sends the pasted posting and selected work-history content to the configured AI endpoint. Cover-letter generation can also send the existing structured resume. Profile details are merged locally into the saved document. Keep environment files, databases, real documents, and personal notes outside version control. This local app has no authentication.
