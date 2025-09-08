// @flow strict
"use client";

import { useState } from "react";
import { experiences } from "@/utils/data/experience";
import Image from "next/image";
import { BsPersonWorkspace } from "react-icons/bs";
import experience from '../../../assets/lottie/code.json';
import AnimationLottie from "../../helper/animation-lottie";
import GlowCard from "../../helper/glow-card";
import HoverDialog from "../../helper/hover-dialog";

function Experience() {
  const [hoveredExperience, setHoveredExperience] = useState(null);

  const handleMouseEnter = (experienceId) => {
    setHoveredExperience(experienceId);
  };

  const handleMouseLeave = () => {
    setHoveredExperience(null);
  };

  return (
    <div id="experience" className="relative z-50 border-t my-12 lg:my-24 border-[#25213b]">
      <Image
        src="/section.svg"
        alt="Hero"
        width={1572}
        height={795}
        className="absolute top-0 -z-10"
      />

      <div className="flex justify-center my-5 lg:py-8">
        <div className="flex  items-center">
          <span className="w-24 h-[2px] bg-[#1a1443]"></span>
          <span className="bg-[#1a1443] w-fit text-white p-2 px-5 text-xl rounded-md">
            Experiences
          </span>
          <span className="w-24 h-[2px] bg-[#1a1443]"></span>
        </div>
      </div>

      <div className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          <div className="flex justify-center items-start">
            <div className="w-full h-full">
              <AnimationLottie animationPath={experience} />
            </div>
          </div>

          <div>
            <div className="flex flex-col gap-6">
              {
                experiences.map(experience => (
                  <HoverDialog
                    key={experience.id}
                    isVisible={hoveredExperience === experience.id}
                    onMouseEnter={() => handleMouseEnter(experience.id)}
                    onMouseLeave={handleMouseLeave}
                    position="left"
                    content={
                      <div className="text-white">
                        <h3 className="text-lg font-bold text-pink-500 mb-2">
                          {experience.title}
                        </h3>
                        <p className="text-violet-400 font-medium mb-3">
                          {experience.company}
                        </p>
                        <p className="text-[#16f2b3] text-sm mb-4 font-medium">
                          {experience.duration}
                        </p>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {experience.description}
                        </p>
                      </div>
                    }
                  >
                    <GlowCard identifier={`experience-${experience.id}`}>
                      <div className="p-3 relative cursor-pointer">
                        <Image
                          src="/blur-23.svg"
                          alt="Hero"
                          width={1080}
                          height={200}
                          className="absolute bottom-0 opacity-80"
                        />
                        <div className="flex justify-center">
                          <p className="text-xs sm:text-sm text-[#16f2b3]">
                            {experience.duration}
                          </p>
                        </div>
                        <div className="flex items-center gap-x-8 px-3 py-5">
                          <div className="text-violet-500 transition-all duration-300 hover:scale-125">
                            <BsPersonWorkspace size={36} />
                          </div>
                          <div>
                            <p className="text-base sm:text-xl mb-2 font-medium uppercase">
                              {experience.title}
                            </p>
                            <p className="text-sm sm:text-base">
                              {experience.company}
                            </p>
                          </div>
                        </div>
                      </div>
                    </GlowCard>
                  </HoverDialog>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Experience;
