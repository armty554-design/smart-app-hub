// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBranchFoldersForBranch,
  createBranchFolder,
  updateBranchFolder,
  deleteBranchFolder,
  addLinkToBranchFolder,
  updateLinkInBranchFolder,
  removeLinkFromBranchFolder,
  moveBranchFolderOrder,
} from '../services/employeeLinksService';

describe('Branch Shared Folders (โฟลเดอร์ประจำสาขา)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('สร้างโฟลเดอร์เริ่มต้นประจำสาขาให้อัตโนมัติเมื่อยังไม่มี', () => {
    const folders = getBranchFoldersForBranch('สันกำแพง');
    expect(folders.length).toBeGreaterThanOrEqual(1);
    expect(folders[0].branchName).toBe('สันกำแพง');
    expect(folders[0].name).toContain('สันกำแพง');
    expect(folders[0].color).toBe('#10b981');
  });

  it('แยกโฟลเดอร์ของแต่ละสาขาออกจากกันอย่างอิสระ', () => {
    const skpFolders = getBranchFoldersForBranch('สันกำแพง');
    const bpFolders = getBranchFoldersForBranch('บางพลี');
    expect(skpFolders[0].branchName).toBe('สันกำแพง');
    expect(bpFolders[0].branchName).toBe('บางพลี');
    expect(skpFolders[0].id).not.toBe(bpFolders[0].id);
  });

  it('เพิ่ม ลบ แก้ไข โฟลเดอร์ประจำสาขาได้', async () => {
    const branch = 'สันกำแพง';
    const created = await createBranchFolder(
      branch,
      {
        name: 'งานเอกสารด่วน สันกำแพง',
        description: 'รวมลิงก์เอกสารประจำสาขา',
        color: '#10b981',
      },
      'สมชาย (100001)'
    );

    const newFolder = created.find((f) => f.name === 'งานเอกสารด่วน สันกำแพง');
    expect(newFolder).toBeDefined();

    // แก้ไข
    if (newFolder) {
      const updated = await updateBranchFolder(
        branch,
        newFolder.id,
        { name: 'งานเอกสารด่วน สันกำแพง V2' },
        'สมหญิง (100002)'
      );
      const edited = updated.find((f) => f.id === newFolder.id);
      expect(edited?.name).toBe('งานเอกสารด่วน สันกำแพง V2');
      expect(edited?.updatedBy).toBe('สมหญิง (100002)');

      // ลบ
      const afterDelete = await deleteBranchFolder(branch, newFolder.id);
      expect(afterDelete.find((f) => f.id === newFolder.id)).toBeUndefined();
    }
  });

  it('เพิ่ม แก้ไข และลบลิงก์ในโฟลเดอร์ประจำสาขา พร้อมบันทึกเวลาและผู้แก้ไขล่าสุด', async () => {
    const branch = 'สันกำแพง';
    const folders = getBranchFoldersForBranch(branch);
    const targetFolder = folders[0];

    // เพิ่มลิงก์
    const afterAdd = await addLinkToBranchFolder(branch, targetFolder.id, {
      title: 'แบบฟอร์มเบิกอุปกรณ์สาขา',
      url: 'https://docs.google.com/forms/d/sample-form',
      codeOrTopic: 'งานทั่วไป',
      description: 'ส่งคำขอก่อนวันศุกร์',
      updatedBy: 'สมชาย (100001)',
    });

    const folderWithLink = afterAdd.find((f) => f.id === targetFolder.id);
    expect(folderWithLink?.links.length).toBe(1);
    const linkItem = folderWithLink?.links[0];
    expect(linkItem?.title).toBe('แบบฟอร์มเบิกอุปกรณ์สาขา');
    expect(linkItem?.badge).toBe('Google Form');
    expect(linkItem?.updatedBy).toBe('สมชาย (100001)');

    // แก้ไขลิงก์
    if (linkItem) {
      const afterEdit = await updateLinkInBranchFolder(
        branch,
        targetFolder.id,
        linkItem.id,
        {
          title: 'แบบฟอร์มเบิกอุปกรณ์สาขา (อัปเดตใหม่)',
          updatedBy: 'สมหญิง (100002)',
        }
      );
      const editedLink = afterEdit
        .find((f) => f.id === targetFolder.id)
        ?.links.find((l) => l.id === linkItem.id);
      expect(editedLink?.title).toBe('แบบฟอร์มเบิกอุปกรณ์สาขา (อัปเดตใหม่)');
      expect(editedLink?.updatedBy).toBe('สมหญิง (100002)');

      // ลบลิงก์
      const afterRemove = await removeLinkFromBranchFolder(branch, targetFolder.id, linkItem.id);
      const folderEmpty = afterRemove.find((f) => f.id === targetFolder.id);
      expect(folderEmpty?.links.length).toBe(0);
    }
  });

  it('สลับลำดับโฟลเดอร์ประจำสาขาได้ (เลื่อนซ้าย/ขวา)', async () => {
    const branch = 'เชียงใหม่';
    await createBranchFolder(branch, { name: 'โฟลเดอร์ 1' });
    await createBranchFolder(branch, { name: 'โฟลเดอร์ 2' });

    const current = getBranchFoldersForBranch(branch);
    const secondFolder = current[1];

    const moved = await moveBranchFolderOrder(branch, secondFolder.id, 'left');
    expect(moved[0].id).toBe(secondFolder.id);
  });
});
