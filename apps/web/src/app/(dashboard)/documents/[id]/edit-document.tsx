'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { DocumentStatus, type Field, type Recipient } from '@documenso/prisma/client';
import type { DocumentWithDetails } from '@documenso/prisma/types/document';
import { trpc } from '@documenso/trpc/react';
import { cn } from '@documenso/ui/lib/utils';
import { Card, CardContent } from '@documenso/ui/primitives/card';
import { AddFieldsFormPartial } from '@documenso/ui/primitives/document-flow/add-fields';
import type { TAddFieldsFormSchema } from '@documenso/ui/primitives/document-flow/add-fields.types';
import { AddSignersFormPartial } from '@documenso/ui/primitives/document-flow/add-signers';
import type { TAddSignersFormSchema } from '@documenso/ui/primitives/document-flow/add-signers.types';
import { AddSubjectFormPartial } from '@documenso/ui/primitives/document-flow/add-subject';
import type { TAddSubjectFormSchema } from '@documenso/ui/primitives/document-flow/add-subject.types';
import { AddTitleFormPartial } from '@documenso/ui/primitives/document-flow/add-title';
import type { TAddTitleFormSchema } from '@documenso/ui/primitives/document-flow/add-title.types';
import { DocumentFlowFormContainer } from '@documenso/ui/primitives/document-flow/document-flow-root';
import type { DocumentFlowStep } from '@documenso/ui/primitives/document-flow/types';
import { LazyPDFViewer } from '@documenso/ui/primitives/lazy-pdf-viewer';
import { Stepper } from '@documenso/ui/primitives/stepper';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { useOptionalCurrentTeam } from '~/providers/team';

export type EditDocumentFormProps = {
  className?: string;
  initialDocument: DocumentWithDetails;
  documentRootPath: string;
};

type EditDocumentStep = 'title' | 'signers' | 'fields' | 'subject';
const EditDocumentSteps: EditDocumentStep[] = ['title', 'signers', 'fields', 'subject'];

export const EditDocumentForm = ({
  className,
  initialDocument,
  documentRootPath,
}: EditDocumentFormProps) => {
  const { toast } = useToast();

  const router = useRouter();
  const searchParams = useSearchParams();
  const team = useOptionalCurrentTeam();

  const sortById = (a: { id: number }, b: { id: number }) => {
    return a.id - b.id;
  };

  const [document, setDocument] = useState<DocumentWithDetails>(initialDocument);
  const [recipients, setRecipients] = useState<Recipient[]>(
    initialDocument.Recipient.toSorted(sortById),
  );
  const [fields, setFields] = useState<Field[]>(initialDocument.Field);

  const { data: fetchedDocument, refetch: refetchDocument } =
    trpc.document.getDocumentWithDetailsById.useQuery(
      {
        id: document.id,
        teamId: team?.id,
      },
      {
        trpc: {
          context: {
            skipBatch: true,
          },
        },
      },
    );

  const { mutateAsync: addTitle } = trpc.document.setTitleForDocument.useMutation();
  const { mutateAsync: addFields } = trpc.field.addFields.useMutation();
  const { mutateAsync: addSigners } = trpc.recipient.addSigners.useMutation();
  const { mutateAsync: sendDocument } = trpc.document.sendDocument.useMutation();
  const { mutateAsync: setPasswordForDocument } =
    trpc.document.setPasswordForDocument.useMutation();

  const documentFlow: Record<EditDocumentStep, DocumentFlowStep> = {
    title: {
      title: 'Add Title',
      description: 'Add the title to the document.',
      stepIndex: 1,
    },
    signers: {
      title: 'Add Signers',
      description: 'Add the people who will sign the document.',
      stepIndex: 2,
    },
    fields: {
      title: 'Add Fields',
      description: 'Add all relevant fields for each recipient.',
      stepIndex: 3,
    },
    subject: {
      title: 'Add Subject',
      description: 'Add the subject and message you wish to send to signers.',
      stepIndex: 4,
    },
  };

  const [step, setStep] = useState<EditDocumentStep>(() => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const searchParamStep = searchParams?.get('step') as EditDocumentStep | undefined;

    let initialStep: EditDocumentStep =
      document.status === DocumentStatus.DRAFT ? 'title' : 'signers';

    if (
      searchParamStep &&
      documentFlow[searchParamStep] !== undefined &&
      !(recipients.length === 0 && (searchParamStep === 'subject' || searchParamStep === 'fields'))
    ) {
      initialStep = searchParamStep;
    }

    return initialStep;
  });

  const onAddTitleFormSubmit = async (data: TAddTitleFormSchema) => {
    try {
      const updatedDocument = await addTitle({
        documentId: document.id,
        teamId: team?.id,
        title: data.title,
      });

      setDocument({
        ...document,
        ...updatedDocument,
      });

      setStep('signers');
    } catch (err) {
      console.error(err);

      toast({
        title: 'Error',
        description: 'An error occurred while updating title.',
        variant: 'destructive',
      });
    }
  };

  const onAddSignersFormSubmit = async (data: TAddSignersFormSchema) => {
    try {
      const updatedRecipients = await addSigners({
        documentId: document.id,
        teamId: team?.id,
        signers: data.signers,
      });

      setRecipients(updatedRecipients);

      setStep('fields');
    } catch (err) {
      console.error(err);

      toast({
        title: 'Error',
        description: 'An error occurred while adding signers.',
        variant: 'destructive',
      });
    }
  };

  const onAddFieldsFormSubmit = async (data: TAddFieldsFormSchema) => {
    try {
      const updatedFields = await addFields({
        documentId: document.id,
        fields: data.fields,
      });

      setFields(updatedFields);

      setStep('subject');
    } catch (err) {
      console.error(err);

      toast({
        title: 'Error',
        description: 'An error occurred while adding signers.',
        variant: 'destructive',
      });
    }
  };

  const onAddSubjectFormSubmit = async (data: TAddSubjectFormSchema) => {
    const { subject, message, timezone, dateFormat, redirectUrl } = data.meta;

    try {
      await sendDocument({
        documentId: document.id,
        teamId: team?.id,
        meta: {
          subject,
          message,
          dateFormat,
          timezone,
          redirectUrl,
        },
      });

      toast({
        title: 'Document sent',
        description: 'Your document has been sent successfully.',
        duration: 5000,
      });

      router.push(documentRootPath);
    } catch (err) {
      console.error(err);

      toast({
        title: 'Error',
        description: 'An error occurred while sending the document.',
        variant: 'destructive',
      });
    }
  };

  const onPasswordSubmit = async (password: string) => {
    await setPasswordForDocument({
      documentId: document.id,
      password,
    });
  };

  const currentDocumentFlow = documentFlow[step];

  /**
   * Refresh the data in the background when steps change.
   */
  useEffect(() => {
    void refetchDocument();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /**
   * Update the data when document refresh occurs in the background.
   */
  useEffect(() => {
    if (fetchedDocument) {
      setDocument(fetchedDocument);
      setRecipients(fetchedDocument.Recipient.toSorted(sortById));
      setFields(fetchedDocument.Field);
    }
  }, [fetchedDocument]);

  return (
    <div className={cn('grid w-full grid-cols-12 gap-8', className)}>
      <Card
        className="relative col-span-12 rounded-xl before:rounded-xl lg:col-span-6 xl:col-span-7"
        gradient
      >
        <CardContent className="p-2">
          <LazyPDFViewer
            key={document.documentData.id}
            documentData={document.documentData}
            document={document}
            password={document.documentMeta?.password}
            onPasswordSubmit={onPasswordSubmit}
          />
        </CardContent>
      </Card>

      <div className="col-span-12 lg:col-span-6 xl:col-span-5">
        <DocumentFlowFormContainer
          className="lg:h-[calc(100vh-6rem)]"
          onSubmit={(e) => e.preventDefault()}
        >
          <Stepper
            currentStep={currentDocumentFlow.stepIndex}
            setCurrentStep={(step) => setStep(EditDocumentSteps[step - 1])}
          >
            <AddTitleFormPartial
              key={recipients.length}
              documentFlow={documentFlow.title}
              document={document}
              recipients={recipients}
              fields={fields}
              onSubmit={onAddTitleFormSubmit}
            />

            <AddSignersFormPartial
              key={recipients.length}
              documentFlow={documentFlow.signers}
              document={document}
              recipients={recipients}
              fields={fields}
              onSubmit={onAddSignersFormSubmit}
            />
            <AddFieldsFormPartial
              key={fields.length}
              documentFlow={documentFlow.fields}
              recipients={recipients}
              fields={fields}
              onSubmit={onAddFieldsFormSubmit}
            />
            <AddSubjectFormPartial
              key={recipients.length}
              documentFlow={documentFlow.subject}
              document={document}
              recipients={recipients}
              fields={fields}
              onSubmit={onAddSubjectFormSubmit}
            />
          </Stepper>
        </DocumentFlowFormContainer>
      </div>
    </div>
  );
};
