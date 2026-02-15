import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Target, Rocket, Heart, Lightbulb, Award } from 'lucide-react';
import Header from '../components/shared/Header';
import Footer from '../components/shared/Footer';
import { supabase } from '../utils/supabaseClient';

interface TeamMember {
  name: string;
  role: string;
  description: string;
  image?: string;
  email?: string;
  imageFileName?: string;
}

const AboutUsPage: React.FC = () => {
  const { t } = useTranslation();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchTeamImages = async () => {
      const initialMembers = [
        {
          name: 'Lerdi Salihi',
          role: 'AI Integration, Full Stack Developer, DevOps Apprentice',
          description: 'Expert in AI integration, building intelligent chatbots that feel natural and help businesses automate customer interactions.',
          email: 'lerdi890@gmail.com',
          imageFileName: 'lerdi.jpeg', // or whatever the filename is in your bucket
        },
        {
          name: 'Etrit Hasolli',
          role: 'Full Stack Developer, Startup Founder',
          description: 'Leads technical vision and client relationships with 2+ years of experience in building scalable web applications.',
          email: 'etrit.hasolli@gmail.com',
          imageFileName: 'etrit.jpg',
        },
        {
          name: 'Fatlum Mehmeti',
          role: 'Backend Developer',
          description: 'Specializes in creating robust backend systems that handle thousands of appointments seamlessly.',
          imageFileName: 'fatlum.jpg',
        },
        {
          name: 'Jasin Avdiu',
          role: 'Backend Developer',
          description: 'Focuses on database optimization and API development to ensure lightning-fast performance.',
          email: 'avdiu.jasin04@gmail.com',
          imageFileName: 'jasin.jpg',
        },
        {
          name: 'Marjan Kolaj',
          role: 'Backend Developer',
          description: 'Expert in server architecture and ensuring the platform runs smoothly 24/7.',
          email: 'marijan.kolaj@student.uni-pr.edu',
          imageFileName: 'marjan.jpg',
        },
      ];

      // Get all files from TeamMembers bucket
      const { data: files } = await supabase.storage
        .from('TeamMembers')
        .list();

      const updatedMembers = initialMembers.map((member) => {
        if (member.imageFileName && files) {
          // Check if the file exists in the bucket
          const fileExists = files.find(file => 
            file.name.toLowerCase() === member.imageFileName.toLowerCase()
          );

          if (fileExists) {
            // Get the public URL for the image
            const { data } = supabase.storage
              .from('TeamMembers')
              .getPublicUrl(member.imageFileName);

            return { ...member, image: data.publicUrl };
          }
        }
        return member;
      });

      setTeamMembers(updatedMembers);
    };

    fetchTeamImages();
  }, []);

  const values = [
    {
      icon: Heart,
      title: t('about.values.passionDriven'),
      description: t('about.values.passionDesc'),
    },
    {
      icon: Lightbulb,
      title: t('about.values.innovationFirst'),
      description: t('about.values.innovationDesc'),
    },
    {
      icon: Users,
      title: t('about.values.clientFocused'),
      description: t('about.values.clientDesc'),
    },
    {
      icon: Award,
      title: t('about.values.qualityExcellence'),
      description: t('about.values.qualityDesc'),
    },
  ];

  const milestones = [
    { year: '2024', event: t('about.milestones.2024') },
    { year: '2025', event: t('about.milestones.2025') },
    { year: 'Future', event: t('about.milestones.future') },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-background via-white to-background relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t('about.title')} <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">{t('about.titleHighlight')}</span>
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              {t('about.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-background to-background rounded-2xl p-8 md:p-12 border border-primary/20 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('about.ourStory.title')}</h2>
            <div className="space-y-4 text-gray-700 text-lg leading-relaxed">
              <p>
                {t('about.ourStory.p1')}
              </p>
              <p>
                {t('about.ourStory.p2')}
              </p>
              <p>
                {t('about.ourStory.p3')} <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent font-semibold">{t('about.ourStory.p3Highlight')}</span> {t('about.ourStory.p3End')}
              </p>
              <p>
                {t('about.ourStory.p4')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center mr-4 hover:scale-110 transition-transform">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">{t('about.mission.title')}</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                {t('about.mission.description')}
              </p>
            </div>

            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center mr-4 hover:scale-110 transition-transform">
                  <Rocket className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">{t('about.vision.title')}</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                {t('about.vision.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              These principles guide everything we do and shape how we work with our clients.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div 
                  key={index}
                  className="text-center p-6 bg-white border border-primary/20 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{value.title}</h3>
                  <p className="text-gray-700">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('about.team.title')}</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              The talented individuals behind Appointly-ks's success.
            </p>
          </div>
          
          {/* First Row - 3 members */}
          <div className="flex flex-wrap justify-center gap-12 mb-12">
            {teamMembers.slice(0, 3).map((member, index) => (
              <div 
                key={index}
                className="text-center group max-w-xs"
              >
                <div className="w-40 h-40 bg-gradient-to-br from-primary to-primary-light rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg overflow-hidden">
                  {member.image ? (
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="h-full object-cover"
                    />
                  ) : (
                    <Users className="h-20 w-20 text-white" />
                  )}
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-primary font-medium mb-4">{member.role}</p>
                <p className="text-gray-700">{member.description}</p>
              </div>
            ))}
          </div>

          {/* Second Row - 2 members */}
          <div className="flex flex-wrap justify-center gap-12">
            {teamMembers.slice(3, 5).map((member, index) => (
              <div 
                key={index}
                className="text-center group max-w-xs"
              >
                <div className="w-40 h-40 bg-gradient-to-br from-primary to-primary-light rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg overflow-hidden">
                  {member.image ? (
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="h-20 w-20 text-white" />
                  )}
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-primary font-medium mb-4">{member.role}</p>
                <p className="text-gray-700">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('about.milestones.title')}</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Key milestones in our growth and evolution as a company.
            </p>
          </div>
          <div className="space-y-8 max-w-4xl mx-auto">
            {milestones.map((milestone, index) => (
              <div 
                key={index}
                className="flex items-center transition-all duration-300"
              >
                <div className="flex-shrink-0 w-24 text-right mr-8">
                  <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">{milestone.year}</span>
                </div>
                <div className="flex-shrink-0 w-4 h-4 bg-primary rounded-full mr-8 animate-pulse"></div>
                <div className="flex-grow bg-gradient-to-br from-background to-background p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-primary/20">
                  <p className="text-gray-700">{milestone.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUsPage;

