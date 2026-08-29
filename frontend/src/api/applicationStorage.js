/**
 * Applications are submitted anonymously, but reading one back requires a
 * login. So we keep a local receipt of what this browser has submitted -
 * enough to show "we got it" on the status page, and to fetch the live record
 * once the applicant signs in with the email they applied under.
 *
 * This is a convenience only: the server stays the authority on status.
 */

const KEY = 'submitted_applications';

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (receipts) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(receipts));
  } catch {
    /* private mode or a full quota - the server copy is unaffected */
  }
};

/** Newest first, so the status page opens on the most recent application. */
export const getSubmittedApplications = () => read();

export const rememberApplication = (application) => {
  if (!application?.id) return read();

  const receipt = {
    id: application.id,
    student_name: application.student_name ?? '',
    course_title: application.course_details?.title ?? '',
    status: application.status ?? 'pending',
    submitted_at: application.created_at ?? new Date().toISOString(),
  };

  const receipts = [receipt, ...read().filter((item) => item.id !== receipt.id)];
  write(receipts);
  return receipts;
};

/** Keep the local receipt in step with a status we just fetched. */
export const updateRememberedStatus = (id, status) => {
  const receipts = read().map((item) => (item.id === id ? { ...item, status } : item));
  write(receipts);
  return receipts;
};

export const forgetApplication = (id) => {
  const receipts = read().filter((item) => item.id !== id);
  write(receipts);
  return receipts;
};

export const clearSubmittedApplications = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clean up */
  }
};
