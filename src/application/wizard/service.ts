import { FileUpload } from 'graphql-upload';
import { SubmissionService } from '../../domain/submission';
import { TeamService } from '../../domain/teams/services/team-service';
import { FileService } from '../../domain/file/services/file-service';
import { SemanticExtractionService } from '../../domain/semantic-extraction/services/semantic-extraction-service';
import { AuthorTeamMember } from '../../domain/teams/repositories/types';
import { Author, SubmissionId } from '../../domain/submission/types';
import Submission from '../../domain/submission/services/models/submission';
import { FileType } from '../../domain/file/types';

export class WizardService {
    constructor(
        private readonly submissionService: SubmissionService,
        private readonly teamService: TeamService,
        private readonly fileService: FileService,
        private readonly semanticExtractionService: SemanticExtractionService,
    ) {}

    async saveDetailsPage(submissionId: SubmissionId, userId: string, details: Author): Promise<Submission | null> {
        const submission = await this.submissionService.get(submissionId);
        this.checkOwnership(submission, userId);

        const team = await this.teamService.find(submissionId.value, 'author');
        const teamMembers: Array<AuthorTeamMember> = [
            {
                alias: details,
                meta: { corresponding: true },
            },
        ];
        if (team) {
            this.teamService.update({
                ...team,
                teamMembers,
            });
        } else {
            this.teamService.create({
                role: 'author',
                teamMembers,
                objectId: submissionId.value,
                objectType: 'manuscript',
            });
        }
        return submission;
    }

    async saveManuscriptFile(
        submissionId: SubmissionId,
        userId: string,
        file: FileUpload,
        fileSize: number,
    ): Promise<Submission> {
        const submission = await this.submissionService.get(submissionId);
        this.checkOwnership(submission, userId);

        console.log('blah blah blah');
        const { filename, mimetype: mimeType, createReadStream } = await file;
        console.log('filename', createReadStream);
        console.log('mimeType', mimeType);
        const stream = createReadStream();

        const manuscriptFile = await this.fileService.create(
            submissionId,
            filename,
            mimeType,
            fileSize,
            FileType.MANUSCRIPT_SOURCE_PENDING,
        );

        const fileContents: Buffer = await new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const chunks: Array<any> = [];
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });

        const uploadPromise = this.fileService.upload(fileContents, manuscriptFile);

        manuscriptFile.setStatusToStored();

        const semanticExtractionPromise = this.semanticExtractionService.extractTitle(
            fileContents,
            mimeType,
            filename,
            submissionId,
        );

        try {
            await Promise.all([uploadPromise, semanticExtractionPromise]);
        } catch (e) {
            manuscriptFile.setStatusToCancelled();
        }

        // @todo: decide what to do with previous manuscript
        // option 1: client needs to call delete manuscript mutation and we assume only one current manuscript
        // option 2: handle this in this mutation

        manuscriptFile.setTypeToSource();

        await this.fileService.update({ ...manuscriptFile });

        // this is not elegant but its the best we can do given the fact that files are now a concept
        // outside of Submission, so we patch it in ¯\_(ツ)_/¯
        return new Submission({ ...submission, manuscriptFile });
    }

    private checkOwnership(submission: Submission, userId: string): void {
        if (submission === null) {
            throw new Error('No submission found');
        }
        if (submission.createdBy !== userId) {
            throw new Error('Invalid submission owner');
        }
    }
}
