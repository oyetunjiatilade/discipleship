import { Types } from 'mongoose';
import {
  Cohort,
  Post,
  CohortView,
  PostView,
  PostType,
  toCohortView,
  toPostView,
} from './cohort.model';
import { User } from '../user/user.model';
import { Role } from '../../shared/constants/roles';
import { NotFoundError, AppError, ForbiddenError } from '../../shared/errors';
import { branchFilter, assertBranchAccess } from '../../shared/access/branch-scope';

type Requester = { userId: string; role: string; branchId: string | null };

class CohortService {
  // ── Admin ──
  async listCohorts(requester: Requester): Promise<CohortView[]> {
    const cohorts = await Cohort.find({ ...branchFilter(requester) }).sort({ createdAt: -1 });
    const counts = await User.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          role: Role.CONVERT,
          isActive: true,
          cohortId: { $ne: null },
          ...branchFilter(requester),
        },
      },
      { $group: { _id: '$cohortId', count: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c) => [c._id.toString(), c.count]));
    return cohorts.map((c) => toCohortView(c, map.get(c._id.toString()) ?? 0));
  }

  async createCohort(input: {
    name: string;
    description?: string;
    branchId: string;
  }): Promise<CohortView> {
    const cohort = await Cohort.create({
      name: input.name.trim(),
      description: input.description?.trim() || '',
      branchId: input.branchId,
    });
    return toCohortView(cohort, 0);
  }

  async updateCohort(
    requester: Requester,
    cohortId: string,
    input: { name?: string; description?: string; isActive?: boolean }
  ): Promise<CohortView> {
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) throw new NotFoundError('Cohort', cohortId);
    assertBranchAccess(requester, cohort.branchId?.toString());
    if (input.name !== undefined) cohort.name = input.name.trim();
    if (input.description !== undefined) cohort.description = input.description.trim();
    if (input.isActive !== undefined) cohort.isActive = input.isActive;
    await cohort.save();
    return toCohortView(cohort);
  }

  async assignConvert(requester: Requester, convertId: string, cohortId: string): Promise<void> {
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) throw new NotFoundError('Cohort', cohortId);
    assertBranchAccess(requester, cohort.branchId?.toString());

    const convert = await User.findOne({ _id: convertId, role: Role.CONVERT, isActive: true });
    if (!convert) throw new NotFoundError('Convert', convertId);
    assertBranchAccess(requester, convert.branchId?.toString());

    if (convert.branchId?.toString() !== cohort.branchId?.toString()) {
      throw new AppError('Cohort and convert must belong to the same branch', 400, 'BRANCH_MISMATCH');
    }

    convert.cohortId = new Types.ObjectId(cohortId);
    await convert.save();
  }

  // ── Convert feed ──
  async getFeed(userId: string): Promise<{ cohort: CohortView | null; posts: PostView[] }> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    if (!user.cohortId) return { cohort: null, posts: [] };

    const cohort = await Cohort.findById(user.cohortId);
    const posts = await Post.find({ cohortId: user.cohortId })
      .sort({ createdAt: -1 })
      .limit(100);

    return {
      cohort: cohort ? toCohortView(cohort) : null,
      posts: posts.map((p) => toPostView(p, userId)),
    };
  }

  async createPost(
    userId: string,
    input: { type?: PostType; text: string }
  ): Promise<PostView> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    if (!user.cohortId) {
      throw new AppError('You are not in a cohort yet.', 400, 'NO_COHORT');
    }
    const post = await Post.create({
      cohortId: user.cohortId,
      authorId: user._id,
      authorName: `${user.firstName} ${user.lastName}`,
      type: input.type ?? 'message',
      text: input.text.trim(),
    });
    return toPostView(post, userId);
  }

  async toggleAmen(userId: string, postId: string): Promise<PostView> {
    const post = await Post.findById(postId);
    if (!post) throw new NotFoundError('Post', postId);
    const idx = post.amenBy.findIndex((id) => id.toString() === userId);
    if (idx >= 0) post.amenBy.splice(idx, 1);
    else post.amenBy.push(new Types.ObjectId(userId));
    await post.save();
    return toPostView(post, userId);
  }

  async deletePost(userId: string, postId: string): Promise<void> {
    const post = await Post.findById(postId);
    if (!post) throw new NotFoundError('Post', postId);
    if (post.authorId.toString() !== userId) {
      throw new ForbiddenError('You can only delete your own posts.');
    }
    await post.deleteOne();
  }
}

export const cohortService = new CohortService();
