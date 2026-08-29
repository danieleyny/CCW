-- CHECKLIST_UPGRADE · Part E — Penal Law 35/265/400 is a document WE author, not a
-- notarised upload. There is no such NYPD form and it is not on the portal's upload or
-- Forms lists; the applicant affirms it inside the application. AFF-02 becomes a
-- generate-and-sign requirement, held for the interview (destination 'interview'), no
-- notarisation.
update public.requirements
   set validation_rule = '{"kind":"document","document_type":"affirmation_penal_law"}'::jsonb,
       destination = 'interview'::public.requirement_destination,
       description = 'A plain-language summary of New York Penal Law Articles 35 (justification), 265 (weapons offences) and 400 (licensing). You read it and sign it in our system — our record that you were informed before affirming it inside your application. Not an NYPD form; not notarised; held for your interview.'
 where req_code = 'AFF-02' and effective_to is null;
