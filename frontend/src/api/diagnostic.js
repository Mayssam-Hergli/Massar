import { request } from './client'

export const diagnosticApi = {
  // MS1 — validate the 31 answers and upsert the project's diagnostic row
  submit: (token, profileId, answers) =>
    request(`/diagnostic/answers/${profileId}`, {
      method: 'POST',
      body: { answers },
      token,
    }),

  schema: () => request('/diagnostic/schema'),
}
