import { SubmissionId } from '../../domain/submission/types';
import Submission from '../../domain/submission/services/models/submission';
import { PermissionService, SubmissionOperation } from '../permission/service';
import { User } from '../../domain/user/user';
import { SubmissionService } from '../../domain/submission';

export class DashboardService {
    constructor(
        private readonly permissionService: PermissionService,
        private readonly submissionService: SubmissionService,
    ) {}

    async findMySubmissions(user: User): Promise<Submission[]> {
        return this.submissionService.findByUserId(user.id);
    }

    async startSubmission(user: User, articleType: string): Promise<Submission> {
        const allowed = this.permissionService.userCan(user, SubmissionOperation.CREATE, null);
        if (!allowed) {
            throw new Error('User not allowed to create submission');
        }
        return this.submissionService.create(articleType, user.id);
    }

    async getSubmission(user: User, id: SubmissionId): Promise<Submission> {
        const submission = await this.submissionService.get(id);
        const allowed = this.permissionService.userCan(user, SubmissionOperation.READ, submission);
        if (!allowed) {
            throw new Error('User not allowed to read submission');
        }
        return submission;
    }

    async deleteSubmission(user: User, id: SubmissionId): Promise<boolean> {
        const submission = await this.getSubmission(user, id);
        const allowed = this.permissionService.userCan(user, SubmissionOperation.DELETE, submission);
        if (!allowed) {
            throw new Error('User not allowed to delete submission');
        }
        return this.submissionService.delete(id);
    }
}
