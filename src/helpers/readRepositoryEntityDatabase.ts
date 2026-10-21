import { isDeveloperMode } from 'src/common/environment';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';

export async function readRepositoryEntityDatabase(signal: AbortSignal) {
  if (!isDeveloperMode) {
    throw new Error('Repository synchronization is available only in developer mode.');
  }

  let response: Response;

  try {
    response = await fetch(`${import.meta.env.BASE_URL}__dev/entities`, { cache: 'no-store', signal });
  } catch {
    throw new Error('Could not reach the development server. Check that it is running and try Sync again.');
  }

  if (!response.ok) {
    throw new Error(
      'Could not read the repository database. Check the file and development server, then try Sync again.'
    );
  }

  try {
    return parseMapEntityDatabase(await response.json());
  } catch {
    throw new Error(
      'The repository database is not valid JSON or contains invalid entity data. Fix the file and try Sync again.'
    );
  }
}
