
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export { OperationType };

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: any) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Show a user-friendly alert with technical details for debugging
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes('insufficient permissions')) {
    alert("Permission Denied: You might not be an approved teacher or your role is not set correctly. Please contact an admin.");
  } else {
    alert(`Database Error: ${errorMessage} (${operationType} on ${path})`);
  }
  
  throw new Error(JSON.stringify(errInfo));
}
