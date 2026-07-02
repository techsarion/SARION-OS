import { redirect } from 'next/navigation';

// End of Day is now integrated into the Daily Workspace ("Finish my day").
// This route is kept as a redirect so existing links / bookmarks keep working.
export default function EndOfDayPage() {
  redirect('/check-in');
}
