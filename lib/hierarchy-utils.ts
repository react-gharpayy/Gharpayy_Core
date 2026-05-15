import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * Returns an array of User IDs that belong to the reporting subtree of a manager.
 * Includes direct and indirect reports.
 * 
 * @param managerId The ID of the manager at the top of the subtree
 * @returns Array of User IDs (as strings)
 */
export async function getHierarchySubtree(managerId: string): Promise<string[]> {
  if (!mongoose.Types.ObjectId.isValid(managerId)) return [];

  const results = await mongoose.model('GpAttUser').aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(managerId) } },
    {
      $graphLookup: {
        from: 'gpattusers',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'managerId',
        as: 'reportingSubtree'
      }
    },
    { $project: { 'reportingSubtree._id': 1 } }
  ]).exec();

  if (!results.length || !results[0].reportingSubtree) return [];
  return results[0].reportingSubtree.map((r: any) => r._id.toString());
}

/**
 * Returns true if the targetUser is within the manager's reporting subtree.
 */
export async function isInReportingSubtree(managerId: string, targetUserId: string): Promise<boolean> {
  const subtree = await getHierarchySubtree(managerId);
  return subtree.includes(targetUserId);
}
