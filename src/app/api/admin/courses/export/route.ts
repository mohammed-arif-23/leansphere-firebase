import { NextResponse } from 'next/server';
import { ensureMongooseConnection } from '@/lib/mongodb';
import { models } from '@/models';
import { Types, Document } from 'mongoose';

// Mock auth for now - replace with your actual auth implementation
const getServerSession = async () => ({
  user: { isAdmin: true } // Mock admin access for development
});

interface IModule {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  order?: number;
  duration?: number;
  videoUrl?: string;
  content?: string;
  quiz?: any;
  isPublished?: boolean;
  courseId: Types.ObjectId;
}

interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  language?: string;
  difficulty?: string;
  thumbnailUrl?: string;
  isPublished?: boolean;
  modules: Types.ObjectId[] | IModule[];
}

type CourseDocument = ICourse & {
  modules: IModule[];
};

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureMongooseConnection();

    // Get all courses with their complete nested data
    const courses = await models.Course.find({})
      .populate({
        path: 'modules',
        populate: {
          path: 'contentBlocks',
          model: 'ContentBlock'
        }
      })
      .lean()
      .exec();

    // Format the data for export with complete nested structure
    const exportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      courses: courses.map((course: any) => ({
        title: course.title || '',
        description: course.description || '',
        language: course.language || 'en',
        difficulty: course.difficulty || 'beginner',
        thumbnailUrl: course.thumbnailUrl || '',
        isPublished: course.isPublished ?? false,
        modules: (course.modules || []).map((module: any) => ({
          title: module.title || '',
          description: module.description || '',
          order: module.order,
          duration: module.duration || 0,
          videoUrl: module.videoUrl || '',
          content: module.content || '',
          isPublished: module.isPublished ?? true,
          prerequisites: (module.prerequisites || []).map((p: any) => ({
            module: p.module?._id?.toString(),
            requiredScore: p.requiredScore
          })),
          blocks: (module.contentBlocks || []).map((block: any) => {
            const blockData: any = {
              type: block.type,
              _id: block._id?.toString()
            };
            
            if (block.content) {
              blockData.content = { ...block.content };
              
              // Handle nested blocks
              if (block.content.blocks) {
                blockData.content.blocks = block.content.blocks.map((nestedBlock: any) => ({
                  type: nestedBlock.type,
                  content: nestedBlock.content || {},
                  _id: nestedBlock._id?.toString()
                }));
              }
            } else {
              blockData.content = null;
            }
            
            return blockData;
          })
        }))
      }))
    };

    // Create a JSON string with proper formatting
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create a Blob with the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a response with the Blob
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="courses-export.json"'
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to export courses', details: errorMessage },
      { status: 500 }
    );
  }
}
