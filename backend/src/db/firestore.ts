import { getFirestore } from "../config/firebase";
import type { WhereFilterOp } from "firebase-admin/firestore";

export interface QueryFilter {
  field: string;
  op: WhereFilterOp;
  value: unknown;
}

export class FirestoreService {
  get db() {
    const db = getFirestore();
    if (!db) throw new Error("Firestore is not initialized. Configure Firebase credentials to use Firestore features.");
    return db;
  }

  collection(name: string) {
    return this.db.collection(name);
  }

  async getDocument<T = Record<string, unknown>>(
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    const docRef = this.db.collection(collectionName).doc(docId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) return null;
    return snapshot.data() as T;
  }

  async setDocument(
    collectionName: string,
    docId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.db.collection(collectionName).doc(docId).set(data);
  }

  async updateDocument(
    collectionName: string,
    docId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.db.collection(collectionName).doc(docId).update(data);
  }

  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    await this.db.collection(collectionName).doc(docId).delete();
  }

  async queryDocuments<T = Record<string, unknown>>(
    collectionName: string,
    filters: QueryFilter[] = [],
    limit?: number
  ): Promise<T[]> {
    let query: FirebaseFirestore.Query = this.db.collection(collectionName);
    for (const filter of filters) {
      query = query.where(filter.field, filter.op, filter.value);
    }
    if (limit) query = query.limit(limit);
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as T);
  }

  async getAllDocuments<T = Record<string, unknown>>(collectionName: string): Promise<T[]> {
    const snapshot = await this.db.collection(collectionName).get();
    return snapshot.docs.map((doc) => doc.data() as T);
  }

  async getCollectionCount(collectionName: string): Promise<number> {
    const snapshot = await this.db.collection(collectionName).count().get();
    return snapshot.data().count;
  }

  async batchSet(
    collectionName: string,
    items: Array<Record<string, unknown> & { id: string }>,
    batchSize = 400
  ): Promise<number> {
    if (items.length === 0) return 0;
    let written = 0;
    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      const batch = this.db.batch();
      for (const item of chunk) {
        const docRef = this.db.collection(collectionName).doc(item.id);
        batch.set(docRef, item);
      }
      await batch.commit();
      written += chunk.length;
    }
    return written;
  }
}

export const firestoreService = new FirestoreService();
