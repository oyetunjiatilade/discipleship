import { Branch, BranchView, toBranchView } from './branch.model';
import { NotFoundError, ConflictError } from '../../shared/errors';

class BranchService {
  /** Active branches only — used by the public registration dropdown. */
  async listActiveBranches(): Promise<BranchView[]> {
    const branches = await Branch.find({ isActive: true }).sort({ name: 1 });
    return branches.map(toBranchView);
  }

  /** All branches (including deactivated) — super-admin management view. */
  async listAllBranches(): Promise<BranchView[]> {
    const branches = await Branch.find().sort({ name: 1 });
    return branches.map(toBranchView);
  }

  async createBranch(input: { name: string }): Promise<BranchView> {
    const name = input.name.trim();
    const existing = await Branch.findOne({ name });
    if (existing) {
      throw new ConflictError('A branch with this name already exists');
    }
    const branch = await Branch.create({ name });
    return toBranchView(branch);
  }

  async updateBranch(
    branchId: string,
    input: { name?: string; isActive?: boolean }
  ): Promise<BranchView> {
    const branch = await Branch.findById(branchId);
    if (!branch) throw new NotFoundError('Branch', branchId);
    if (input.name !== undefined) branch.name = input.name.trim();
    if (input.isActive !== undefined) branch.isActive = input.isActive;
    await branch.save();
    return toBranchView(branch);
  }

  /** Throws if the branch doesn't exist or is deactivated — used at registration/creation time. */
  async assertActiveBranch(branchId: string): Promise<void> {
    const branch = await Branch.findOne({ _id: branchId, isActive: true });
    if (!branch) throw new NotFoundError('Branch', branchId);
  }
}

export const branchService = new BranchService();
